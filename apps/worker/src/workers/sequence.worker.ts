import { Worker, Job } from "bullmq";
import { prisma } from "@opensales/database";
import { getRedisConnection } from "../redis";
import { sequenceQueue } from "../queues";
import type { SequenceStepJobData } from "../queues";
import { sendEmail } from "../email.service";

async function processSequenceStep(job: Job<SequenceStepJobData>) {
  const { enrollmentId, sequenceId, contactId, stepOrder } = job.data;

  // Load enrollment
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    console.log(`[sequence] Enrollment ${enrollmentId} is not active, skipping`);
    return;
  }

  // Load the step at this order
  const step = await prisma.sequenceStep.findFirst({
    where: { sequenceId, order: stepOrder },
  });
  if (!step) {
    // No more steps — mark complete
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "COMPLETED", completedAt: new Date(), nextSendAt: null },
    });
    return;
  }

  // Load contact + org SMTP config
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { email: true, firstName: true, lastName: true, orgId: true },
  });
  if (!contact?.email) {
    console.warn(`[sequence] Contact ${contactId} has no email, marking bounced`);
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "BOUNCED", completedAt: new Date() },
    });
    return;
  }

  const org = await (prisma.organization as any).findUnique({
    where: { id: contact.orgId },
    select: { settings: true },
  });
  const smtp = (org?.settings as any)?.smtp;

  // Send email if SMTP configured
  if (smtp?.host && smtp?.user && smtp?.password) {
    const subject = personalise(step.subject, contact.firstName, contact.lastName);
    const htmlBody = personalise(step.body, contact.firstName, contact.lastName);

    await sendEmail(
      {
        host: smtp.host,
        port: smtp.port ?? 587,
        secure: smtp.secure ?? false,
        user: smtp.user,
        password: smtp.password,
        from: smtp.from ?? smtp.user,
      },
      contact.email,
      subject,
      `<p>${htmlBody.replace(/\n/g, "<br>")}</p>`
    );
    console.log(`[sequence] Sent step ${stepOrder} to ${contact.email}`);
  } else {
    console.warn(`[sequence] No SMTP config for org ${contact.orgId}, skipping email`);
  }

  // Find next step
  const nextStep = await prisma.sequenceStep.findFirst({
    where: { sequenceId, order: { gt: stepOrder } },
    orderBy: { order: "asc" },
  });

  if (nextStep) {
    const nextSendAt = new Date(Date.now() + nextStep.delayDays * 86_400_000);
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStep: nextStep.order, nextSendAt },
    });
    // Schedule next step as a delayed job
    const delayMs = Math.max(nextStep.delayDays * 86_400_000, 0);
    await sequenceQueue.add(
      "send-step",
      { enrollmentId, sequenceId, contactId, stepOrder: nextStep.order },
      { delay: delayMs }
    );
  } else {
    // Last step done
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "COMPLETED", completedAt: new Date(), nextSendAt: null },
    });
  }
}

function personalise(template: string, firstName: string, lastName: string): string {
  return template
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{lastName\}\}/gi, lastName)
    .replace(/\{\{fullName\}\}/gi, `${firstName} ${lastName}`);
}

export function createSequenceWorker() {
  const worker = new Worker<SequenceStepJobData>(
    "sequence-steps",
    processSequenceStep,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[sequence] Job ${job.id} completed (enrollment ${job.data.enrollmentId}, step ${job.data.stepOrder})`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[sequence] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

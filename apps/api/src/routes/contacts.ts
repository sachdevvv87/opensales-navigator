import { FastifyPluginAsync } from "fastify";
import { requireAuth, orgScope } from "../plugins/auth";
import { listContacts, getContact, createContact, updateContact, deleteContact, bulkDeleteContacts } from "../services/contact.service";
import { ContactCreateSchema, ContactUpdateSchema, ContactFilterSchema, PaginationSchema, BulkActionSchema, CsvImportSchema } from "@opensales/shared";
import { prisma } from "@opensales/database";
import { parse } from "csv-parse/sync";

export const contactsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  // GET /contacts
  fastify.get("/", async (request) => {
    const query = request.query as Record<string, string>;
    const filters = ContactFilterSchema.parse({
      search: query.search,
      leadStage: query.leadStage ? query.leadStage.split(",") : undefined,
      seniority: query.seniority ? query.seniority.split(",") : undefined,
      assignedToId: query.assignedToId ? query.assignedToId.split(",") : undefined,
      companyId: query.companyId ? query.companyId.split(",") : undefined,
      tags: query.tags ? query.tags.split(",") : undefined,
    });
    const pagination = PaginationSchema.parse({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return listContacts(orgScope(request), filters, pagination);
  });

  // POST /contacts
  fastify.post("/", async (request, reply) => {
    const body = ContactCreateSchema.parse(request.body);
    const contact = await createContact(orgScope(request), request.user.userId, body);
    return reply.code(201).send(contact);
  });

  // GET /contacts/:id
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const contact = await getContact(id, orgScope(request));
    if (!contact) return reply.code(404).send({ error: "Contact not found" });
    return contact;
  });

  // PATCH /contacts/:id
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = ContactUpdateSchema.parse(request.body);
    const existing = await getContact(id, orgScope(request));
    if (!existing) return reply.code(404).send({ error: "Contact not found" });
    return updateContact(id, orgScope(request), body);
  });

  // DELETE /contacts/:id
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await getContact(id, orgScope(request));
    if (!existing) return reply.code(404).send({ error: "Contact not found" });
    await deleteContact(id, orgScope(request));
    return reply.code(204).send();
  });

  // POST /contacts/bulk-action
  fastify.post("/bulk-action", async (request, reply) => {
    const body = BulkActionSchema.parse(request.body);
    const orgId = orgScope(request);

    switch (body.action) {
      case "delete":
        await bulkDeleteContacts(body.ids, orgId);
        return { affected: body.ids.length };

      case "assign": {
        const assignedToId = (body.payload as Record<string, string>)?.assignedToId;
        await prisma.contact.updateMany({
          where: { id: { in: body.ids }, orgId },
          data: { assignedToId },
        });
        return { affected: body.ids.length };
      }

      case "change-stage": {
        const leadStage = (body.payload as Record<string, string>)?.leadStage;
        await prisma.contact.updateMany({
          where: { id: { in: body.ids }, orgId },
          data: { leadStage: leadStage as never },
        });
        return { affected: body.ids.length };
      }

      case "tag": {
        const tag = (body.payload as Record<string, string>)?.tag;
        const contacts = await prisma.contact.findMany({ where: { id: { in: body.ids }, orgId } });
        await Promise.all(
          contacts.map((c) =>
            prisma.contact.update({
              where: { id: c.id },
              data: { tags: [...new Set([...c.tags, tag])] },
            })
          )
        );
        return { affected: body.ids.length };
      }

      case "add-to-list": {
        const listId = (body.payload as Record<string, string>)?.listId;
        await prisma.listMemberContact.createMany({
          data: body.ids.map((contactId) => ({
            listId,
            contactId,
            addedBy: request.user.userId,
          })),
          skipDuplicates: true,
        });
        return { affected: body.ids.length };
      }

      default:
        return reply.code(400).send({ error: "Unknown action" });
    }
  });

  // POST /contacts/bulk-import
  fastify.post("/bulk-import", async (request, reply) => {
    const orgId = orgScope(request);
    const parts = request.parts();
    let csvBuffer: Buffer | null = null;
    let mapping: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === "file" && part.fieldname === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        csvBuffer = Buffer.concat(chunks);
      } else if (part.type === "field" && part.fieldname === "mapping") {
        mapping = JSON.parse(part.value as string);
      }
    }

    if (!csvBuffer) return reply.code(400).send({ error: "No CSV file provided" });

    const records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true });
    let created = 0;
    let skipped = 0;

    for (const row of records) {
      const contactData: Record<string, string> = {};
      for (const [csvCol, field] of Object.entries(mapping)) {
        if (row[csvCol]) contactData[field] = row[csvCol];
      }

      if (!contactData.firstName && !contactData.lastName && !contactData.email) {
        skipped++;
        continue;
      }

      if (contactData.email) {
        const existing = await prisma.contact.findFirst({
          where: { orgId, email: contactData.email, deletedAt: null },
        });
        if (existing) { skipped++; continue; }
      }

      await prisma.contact.create({
        data: {
          orgId,
          firstName: contactData.firstName ?? "",
          lastName: contactData.lastName ?? "",
          email: contactData.email,
          title: contactData.title,
          phone: contactData.phone,
          locationCity: contactData.locationCity,
          locationCountry: contactData.locationCountry,
          source: "csv_import",
          createdById: request.user.userId,
          tags: ["imported"],
        },
      });
      created++;
    }

    return { created, skipped, total: records.length };
  });
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">OpenSales Navigator</h1>
          <p className="text-slate-400 mt-2">Open-source B2B sales intelligence</p>
        </div>
        {children}
      </div>
    </div>
  );
}

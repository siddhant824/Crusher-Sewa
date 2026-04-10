import { Link } from "react-router-dom";

const highlights = [
  { label: "Order Visibility", value: "100%", note: "Live status from request to payment" },
  { label: "Operational Areas", value: "6", note: "Materials, stock, delivery, invoices and more" },
  { label: "Role Clarity", value: "3", note: "Contractor, manager, and admin workflows" },
];

const roleBlocks = [
  {
    title: "Contractors",
    description: "Place orders quickly and track every commercial and logistics step in one view.",
    points: [
      "Browse materials with current availability",
      "Create orders in minutes",
      "Track approval, delivery, invoice, and payment status",
    ],
  },
  {
    title: "Admin and Managers",
    description: "Run operations with tighter control across dispatch, stock movement, and billing.",
    points: [
      "Approve orders and assign delivery trips",
      "Manage production updates and stock levels",
      "Generate invoices and record payments accurately",
    ],
  },
];

const operationsFlow = [
  {
    title: "Request Intake",
    detail: "Contractors submit material requests with quantity and project context.",
  },
  {
    title: "Commercial Approval",
    detail: "Admin or managers validate stock, pricing, and approve for fulfillment.",
  },
  {
    title: "Dispatch Planning",
    detail: "Trips are assigned, deliveries are tracked, and stock movement is recorded.",
  },
  {
    title: "Billing and Closure",
    detail: "Invoices are issued and payment history is maintained for clear reconciliation.",
  },
];

const capabilities = [
  "Material catalog and stock overview",
  "Order creation and approval workflow",
  "Production-linked stock adjustment",
  "Truck dispatch and delivery tracking",
  "Invoice generation and invoice history",
  "Payment records and status timeline",
];

const LandingPage = () => {
  return (
    <div className="space-y-10 pb-16 sm:space-y-12">
      <section className="relative overflow-hidden rounded-[32px] border border-stone-200 bg-gradient-to-b from-white via-stone-50 to-white px-6 py-10 shadow-[0_18px_50px_rgba(68,64,60,0.08)] sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
              Crusher Operations Platform
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              One professional workspace for crusher order, dispatch, and payment operations
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
              Crusher Sewa is built for real supply-chain execution, not generic ecommerce.
              Contractors place requests while admin teams manage stock, delivery trips,
              invoicing, and payment records with full operational visibility.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to="/register"
                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
              >
                Register as Contractor
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200/80 bg-white/80 p-5 backdrop-blur sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Operations Cycle
            </p>
            <div className="mt-4 space-y-3">
              {operationsFlow.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3.5"
                >
                  <p className="text-sm font-semibold text-stone-900">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              {item.value}
            </p>
            <p className="mt-1.5 text-sm text-stone-600">{item.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {roleBlocks.map((block) => (
          <article
            key={block.title}
            className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm sm:p-7"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
              {block.title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base">
              {block.description}
            </p>
            <div className="mt-5 space-y-3">
              {block.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-teal-600" />
                  <p className="text-sm leading-6 text-stone-700">{point}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              System Coverage
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Built for on-ground crusher and dispatch workflows
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
              The platform aligns field operations and finance so teams can move from
              request to closure without switching between disconnected tools.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm font-medium leading-6 text-stone-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-stone-900 px-6 py-8 text-white shadow-[0_20px_60px_rgba(28,25,23,0.35)] sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-stone-400">
              Get Started
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2rem]">
              Run your crusher supply operations with confidence and clarity
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
              Bring contractor requests, approvals, dispatch, invoicing, and payments
              into one consistent system your team can rely on every day.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-stone-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

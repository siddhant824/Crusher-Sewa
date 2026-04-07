import { Link } from "react-router-dom";

const systemBlocks = [
  {
    title: "For Contractors",
    points: [
      "Browse available materials and stock",
      "Place orders and follow approval status",
      "Track delivery progress and payment status",
    ],
  },
  {
    title: "For Admin and Manager",
    points: [
      "Manage materials, users, stock, and production",
      "Approve orders and assign delivery trips",
      "Generate invoices and record payments",
    ],
  },
];

const workflow = [
  "Contractor places an order",
  "Admin or manager reviews and approves it",
  "Stock updates and delivery trips are assigned",
  "Invoice is generated and payment is recorded",
];

const LandingPage = () => {
  return (
    <div className="space-y-12 pb-16">
      <section className="rounded-[28px] border border-stone-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Crusher Material Order Management
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              A simple system to manage crusher materials, orders, delivery, invoices, and payments
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              Crusher Sewa is built for construction material supply operations. It helps contractors place orders and helps admin or managers handle approvals, stock, truck delivery, invoicing, and payment records in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
              >
                Register as Contractor
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              Main Flow
            </p>
            <div className="mt-5 space-y-4">
              {workflow.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-stone-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {systemBlocks.map((block) => (
          <div
            key={block.title}
            className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
              {block.title}
            </h2>
            <div className="mt-5 space-y-3">
              {block.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-600" />
                  <p className="text-sm leading-6 text-stone-600">{point}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
              What the system covers
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
              This project is focused on practical crusher-site workflow. It is not a generic shopping site. It covers materials, stock updates through production, order approval, delivery trips, invoices, and payment tracking.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Material management",
              "Order placement and approval",
              "Production and stock control",
              "Truck-based delivery trips",
              "Invoice generation",
              "Payment tracking",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm font-medium text-stone-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-stone-900 px-6 py-8 text-white shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              Start managing crusher material orders in a cleaner way
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
              Contractors can register and place orders, while admin and managers can handle the full operational process from approval to delivery and payment.
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
              className="rounded-xl border border-stone-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

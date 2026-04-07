import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#f5f5f4_38%,#fafaf9_100%)]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-600">
                <span className="text-xs font-bold text-white">CS</span>
              </div>
              <span className="text-sm text-stone-600">Crusher Material Sewa</span>
            </div>
            <p className="text-sm text-stone-500">
              (c) {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;

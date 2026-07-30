import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-gray-50">
      <Sidebar />
      <main className="min-h-screen min-w-0 flex-1 lg:ml-0">
        <div className="min-w-0 p-3 pt-16 sm:p-4 sm:pt-16 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

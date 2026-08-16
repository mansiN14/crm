import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Package,
  Briefcase,
  Calendar,
  Bell,
  FileText,
  CreditCard,
  Clock,
  CheckCircle2,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inquiries', label: 'Inquiries', icon: Users },
  { path: '/students', label: 'Students', icon: GraduationCap },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/contacts', label: 'Contacts', icon: Briefcase },
  { path: '/meetings', label: 'Meetings', icon: Calendar },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/quotations', label: 'Quotations', icon: FileText },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/ongoing', label: 'Ongoing Clients', icon: Clock },
  { path: '/completed', label: 'Completed Clients', icon: CheckCircle2 },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/users', label: 'Users', icon: Users, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    return true;
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-navy-800 text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 max-w-[86vw] bg-navy-900 transform transition-transform duration-300 ease-in-out lg:max-w-none lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-navy-700">
            <h1 className="text-xl font-bold text-white tracking-wide">THE TRUE AXIS</h1>
            <p className="text-navy-300 text-sm mt-1">Education Consulting</p>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-maroon-700 text-white shadow-lg'
                      : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-navy-700">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-navy-800">
              <div className="w-10 h-10 rounded-full bg-maroon-600 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.name}</p>
                <p className="text-navy-300 text-sm capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 mt-2 rounded-lg text-navy-200 hover:bg-navy-800 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

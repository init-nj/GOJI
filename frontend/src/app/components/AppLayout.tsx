import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
  FileText,
  Settings,
  LogOut,
  User,
  Calculator,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Payroll', href: '/payroll', icon: Calculator },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Budget & Revenue', href: '/budget', icon: Wallet },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div
              className="text-2xl font-bold text-black cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              GOJI
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map(item => {
                const isActive = location.pathname === item.href;
                return (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className={`gap-2 ${
                      isActive
                        ? 'bg-gray-100 text-black font-medium'
                        : 'text-gray-600 hover:text-black'
                    }`}
                    onClick={() => navigate(item.href)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                );
              })}
            </nav>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#FF6B6B] text-white text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">
                    {user?.first_name} {user?.last_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

import { useState } from 'react';
import {
  PlusCircleIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const SIDEBAR_BG    = '#0D1117';   
const SIDEBAR_BORD  = '#232933';   
const BLUE_ACCENT   = '#3498DB';

const HSESidebar = ({ activePage, onNavigate, onReport }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const NAV_ITEMS = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: Squares2X2Icon,   path: '/dashboard' },
    { id: 'incidents', label: t('sidebar.incidents'), icon: DocumentTextIcon, path: '/incidents' },
    { id: 'analytics', label: t('sidebar.analytics'), icon: ChartBarIcon,     path: '/analytics' },
  ];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    toast.success(`Language changed to ${lng.toUpperCase()}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Burger Button */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-md bg-[#1c1f26] border border-gray-700 shadow-xl"
      >
        {isOpen ? <XMarkIcon className="h-6 w-6 text-white" /> : <Bars3Icon className="h-6 w-6 text-white" />}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-transform duration-300 transform 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{
          width: 260,
          background: SIDEBAR_BG,
          borderRight: `1px solid ${SIDEBAR_BORD}`,
        }}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: `1px solid ${SIDEBAR_BORD}` }}>
          <div className="flex items-center justify-center rounded-md w-9 h-9" style={{ background: 'linear-gradient(135deg, #2980B9 0%, #3498DB 100%)' }}>
            <ShieldSolid className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SafetyFirst</p>
            <p className="text-xs font-medium" style={{ color: BLUE_ACCENT }}>HSE</p>
          </div>
        </div>

        {/* Primary Action */}
        <div className="px-4 pt-5 pb-2">
          <button
            onClick={() => { onReport(); setIsOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg, #2980B9 0%, #3498DB 100%)' }}
          >
            <PlusCircleIcon className="h-4 w-4" />
            {t('sidebar.report_incident')}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                onClick={() => { onNavigate(path); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group"
                style={{
                  background: isActive ? 'rgba(52, 152, 219, 0.12)' : 'transparent',
                  color: isActive ? BLUE_ACCENT : '#9CA3AF',
                  borderLeft: isActive ? `3px solid ${BLUE_ACCENT}` : '3px solid transparent',
                }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto px-3 pb-6">
          <div className="mb-4 px-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 ml-1">Language / اللغة</p>
            <div className="flex gap-2">
              {[{ code: 'en', flag: '🇺🇸' }, { code: 'fr', flag: '🇫🇷' }, { code: 'ar', flag: '🇸🇦' }].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border ${i18n.language === lang.code ? 'bg-blue-500/10 text-blue-400 border-blue-500/40' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                >
                  {lang.flag} {lang.code}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: '#1c1f26', border: `1px solid ${SIDEBAR_BORD}` }}>
            <div className="flex-shrink-0"><UserCircleIcon className="h-9 w-9 text-gray-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.username || 'Admin User'}</p>
              <p className="text-[10px] text-gray-500 font-medium truncate uppercase">{user?.role || 'Administrator'}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-white/5 transition-colors group">
              <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-500 group-hover:text-red-400" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default HSESidebar;

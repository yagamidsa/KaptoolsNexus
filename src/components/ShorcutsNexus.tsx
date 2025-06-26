import React, { useState, useEffect, useRef } from 'react';
import './ShorcutsNexus.css';

interface ShortcutItem {
    id: string;
    label: string;
    description: string;
    icon: string;
    category: string;
    url: string;
    status: 'online' | 'offline' | 'maintenance';
    priority: 'high' | 'medium' | 'low';
    color: string;
}

interface ShortcutsNexusProps {
    isOpen: boolean;
    onClose: () => void;
}


const NeonIcons = {
    sandbox: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`sandbox-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
                <filter id={`glow-${color}`}>
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#sandbox-${color})`}
                filter={`url(#glow-${color})`}
            />
            <circle cx="12" cy="7" r="1" fill={color} opacity="0.8" />
            <circle cx="12" cy="12" r="1" fill={color} opacity="0.6" />
            <circle cx="12" cy="17" r="1" fill={color} opacity="0.4" />
        </svg>
    ),

    control: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`control-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                </linearGradient>
            </defs>
            <rect
                x="3" y="3" width="18" height="18" rx="4"
                stroke={color}
                strokeWidth="2"
                fill={`url(#control-${color})`}
                filter={`url(#glow-${color})`}
            />
            <circle cx="9" cy="9" r="2" stroke={color} strokeWidth="1.5" fill="none" />
            <circle cx="15" cy="15" r="2" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M9 15h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M15 9v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    ai: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`ai-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path
                d="M12 2a10 10 0 1010 10A10 10 0 0012 2z"
                stroke={color}
                strokeWidth="2"
                fill={`url(#ai-${color})`}
                filter={`url(#glow-${color})`}
            />
            <circle cx="8" cy="10" r="1.5" fill={color} opacity="0.9" />
            <circle cx="16" cy="10" r="1.5" fill={color} opacity="0.9" />
            <path d="M8 16s2 2 4 2 4-2 4-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M12 6v4M10 8h4" stroke={color} strokeWidth="1" strokeLinecap="round" />
        </svg>
    ),

    data: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`data-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                </linearGradient>
            </defs>
            <ellipse
                cx="12" cy="5" rx="9" ry="3"
                stroke={color}
                strokeWidth="2"
                fill={`url(#data-${color})`}
                filter={`url(#glow-${color})`}
            />
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke={color} strokeWidth="2" fill="none" />
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke={color} strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="1" fill={color} opacity="0.8" />
        </svg>
    ),

    survey: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`survey-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                </linearGradient>
            </defs>
            <rect
                x="4" y="3" width="16" height="18" rx="2"
                stroke={color}
                strokeWidth="2"
                fill={`url(#survey-${color})`}
                filter={`url(#glow-${color})`}
            />
            <path d="M8 7h8M8 11h8M8 15h5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="6" cy="7" r="0.5" fill={color} />
            <circle cx="6" cy="11" r="0.5" fill={color} />
            <circle cx="6" cy="15" r="0.5" fill={color} />
        </svg>
    ),

    analytics: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`analytics-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path
                d="M3 21V7l5-4 6 4 7-3v17H3z"
                stroke={color}
                strokeWidth="2"
                fill={`url(#analytics-${color})`}
                filter={`url(#glow-${color})`}
            />
            <path d="M8 17v-4M12 17V9M16 17v-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    production: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`production-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                </linearGradient>
            </defs>
            <rect
                x="2" y="8" width="20" height="12" rx="2"
                stroke={color}
                strokeWidth="2"
                fill={`url(#production-${color})`}
                filter={`url(#glow-${color})`}
            />
            <path d="M6 4v4M10 4v4M14 4v4M18 4v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="14" r="2" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M8 14h8" stroke={color} strokeWidth="1" strokeLinecap="round" />
        </svg>
    ),

    support: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`support-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                </linearGradient>
            </defs>
            <circle
                cx="12" cy="12" r="10"
                stroke={color}
                strokeWidth="2"
                fill={`url(#support-${color})`}
                filter={`url(#glow-${color})`}
            />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="12" cy="17" r="1" fill={color} />
        </svg>
    ),

    utilities: (color: string) => (
        <svg viewBox="0 0 24 24" fill="none" className="shortcuts-neon-svg">
            <defs>
                <linearGradient id={`utilities-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke={color}
                strokeWidth="2"
                fill={`url(#utilities-${color})`}
                filter={`url(#glow-${color})`}
            />
            <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1" fill="none" />
        </svg>
    )
};

const ShortcutsNexus: React.FC<ShortcutsNexusProps> = ({ isOpen, onClose }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [hoveredItem, setHoveredItem] = useState<string>('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);


    const shortcuts: ShortcutItem[] = [

        {
            id: 's3',
            label: 'Sandbox 3',
            description: 'Development Environment Alpha • Real-time deployment testing',
            icon: 'sandbox',
            category: 'sandbox',
            url: 'https://sandbox3-kap-ui.azurewebsites.net/#/projects/dashboard',
            status: 'online',
            priority: 'high',
            color: '#00ff87'
        },
        {
            id: 's12',
            label: 'Sandbox 12',
            description: 'Development Environment Beta • Feature integration testing',
            icon: 'sandbox',
            category: 'sandbox',
            url: 'https://sandbox12-kap-ui.azurewebsites.net/#/projects/dashboard',
            status: 'online',
            priority: 'medium',
            color: '#6c5ce7'
        },
        {
            id: 's13',
            label: 'Sandbox 13',
            description: 'Development Environment Gamma • Experimental features',
            icon: 'sandbox',
            category: 'sandbox',
            url: 'https://sandbox13-kap-ui.azurewebsites.net/#/projects/dashboard',
            status: 'online',
            priority: 'medium',
            color: '#ff6b9d'
        },


        {
            id: 'm3',
            label: 'Mission Control 3',
            description: 'Admin Panel Alpha • System monitoring and configuration',
            icon: 'control',
            category: 'control',
            url: 'https://sandbox3-kap-admin-v2.azurewebsites.net/home#/home',
            status: 'online',
            priority: 'high',
            color: '#ff9f43'
        },
        {
            id: 'm12',
            label: 'Mission Control 12',
            description: 'Admin Panel Beta • User management and analytics',
            icon: 'control',
            category: 'control',
            url: 'https://sandbox12-kap-admin-v2.azurewebsites.net/#/home',
            status: 'online',
            priority: 'medium',
            color: '#fd79a8'
        },
        {
            id: 'm13',
            label: 'Mission Control 13',
            description: 'Admin Panel Gamma • Advanced configuration tools',
            icon: 'control',
            category: 'control',
            url: 'https://sandbox13-kap-admin-v2.azurewebsites.net/#/home',
            status: 'online',
            priority: 'medium',
            color: '#e17055'
        },


        {
            id: 'afeprod',
            label: 'Affectiva Production',
            description: 'Emotion AI Production • Real-time facial emotion analysis',
            icon: 'ai',
            category: 'ai',
            url: 'https://labs-portal.affectiva.com/portal/auth/login',
            status: 'online',
            priority: 'high',
            color: '#a29bfe'
        },
        {
            id: 'afedev',
            label: 'Affectiva Development',
            description: 'Emotion AI Development • Testing emotional recognition models',
            icon: 'ai',
            category: 'ai',
            url: 'https://kantar-portal.sandbox.affdex.com/portal/auth/login',
            status: 'online',
            priority: 'medium',
            color: '#fd79a8'
        },


        {
            id: 'linkprod',
            label: 'LinkDB Production',
            description: 'Link Database Production • Marketing research data hub',
            icon: 'data',
            category: 'data',
            url: 'https://linkdb.kantar.co.uk/logon.aspx?ReturnUrl=%2fLinkTests%2fSearchLinkTests.aspx',
            status: 'online',
            priority: 'high',
            color: '#00cec9'
        },
        {
            id: 'linkuat',
            label: 'LinkDB UAT',
            description: 'Link Database Testing • Data validation and testing environment',
            icon: 'data',
            category: 'data',
            url: 'https://linkdbkantarwareuat.grpitsrv.com/LinkTests/SearchLinkTests.aspx',
            status: 'online',
            priority: 'medium',
            color: '#74b9ff'
        },


        {
            id: 'nfiledu',
            label: 'Nfield Manager EU',
            description: 'Survey Management EU • European survey data collection',
            icon: 'survey',
            category: 'survey',
            url: 'https://online-managereu.nfieldmr.com/surveys',
            status: 'online',
            priority: 'high',
            color: '#55efc4'
        },
        {
            id: 'nfieldcn',
            label: 'Nfield Manager CN',
            description: 'Survey Management China • Chinese market research platform',
            icon: 'survey',
            category: 'survey',
            url: 'https://identitycn.nfieldcn.com/Account/Login',
            status: 'online',
            priority: 'medium',
            color: '#ff7675'
        },

        // ANALYTICS ENGINES
        {
            id: 'beastprod',
            label: 'Beast Production',
            description: 'Analytics Engine Production • Advanced data processing',
            icon: 'analytics',
            category: 'analytics',
            url: 'https://beast.kantar.com/#/',
            status: 'online',
            priority: 'high',
            color: '#e84393'
        },
        {
            id: 'beastuat',
            label: 'Beast UAT',
            description: 'Analytics Engine Testing • Analytics model validation',
            icon: 'analytics',
            category: 'analytics',
            url: 'https://beast-uat.kantar.com/#/projects',
            status: 'online',
            priority: 'medium',
            color: '#fdcb6e'
        },

        // PRODUCTION SYSTEMS
        {
            id: 'sprod',
            label: 'KAP Production',
            description: 'Main Production Environment • Live client-facing platform',
            icon: 'production',
            category: 'production',
            url: 'https://kap.kantar.com/#/projects/dashboard',
            status: 'online',
            priority: 'high',
            color: '#00b894'
        },
        {
            id: 'mprod',
            label: 'Mission Control Prod',
            description: 'Production Mission Control • Live system administration',
            icon: 'production',
            category: 'production',
            url: 'https://kapmissioncontrol.kantar.com/home#/home',
            status: 'online',
            priority: 'high',
            color: '#0984e3'
        },

        // SUPPORT & UTILITIES
        {
            id: 'shap',
            label: 'Support SharePoint',
            description: 'Issue Category Triage • Technical support and documentation',
            icon: 'support',
            category: 'support',
            url: 'https://ktglbuc.sharepoint.com/sites/KAPSupport/SitePages/Issue%20Category%20Triage.aspx',
            status: 'online',
            priority: 'high',
            color: '#ffeaa7'
        },
        {
            id: 'sprint',
            label: 'OIRP Dashboard',
            description: 'Operations Infrastructure • Sprint planning and tracking',
            icon: 'utilities',
            category: 'utilities',
            url: 'https://ktglbuc.sharepoint.com/:x:/s/KAPTechnologyTeam/EfFOoJiiXP5NsrQTJbSS7DcBInqjleccq-TFxoEGb8qNSg?e=1HSmUo',
            status: 'online',
            priority: 'medium',
            color: '#81ecec'
        },
        {
            id: 'spec',
            label: 'Spec Outputs',
            description: 'Specification Management • Output requirements documentation',
            icon: 'utilities',
            category: 'utilities',
            url: 'https://ktglbuc.sharepoint.com/:x:/s/KAPTechnologyTeam/EQQF0sFDKmJDkCtxPSXyWlcB5mBO6N2YmNIEW7a-kz8eyA?e=KBzHVY',
            status: 'online',
            priority: 'medium',
            color: '#fab1a0'
        },
        {
            id: 'extprod',
            label: 'Extractor Production',
            description: 'Data Extractor Production • Live data extraction services',
            icon: 'utilities',
            category: 'utilities',
            url: 'https://extractor-client-prod.azurewebsites.net/home',
            status: 'online',
            priority: 'high',
            color: '#ff7675'
        },
        {
            id: 'extuat',
            label: 'Extractor UAT',
            description: 'Data Extractor Testing • Extraction service validation',
            icon: 'utilities',
            category: 'utilities',
            url: 'https://extractor-client-uat.azurewebsites.net/home',
            status: 'online',
            priority: 'medium',
            color: '#a29bfe'
        },
        {
            id: 'codecut',
            label: 'Code Cut Tracker',
            description: 'Code Release Management • Development lifecycle tracking',
            icon: 'utilities',
            category: 'utilities',
            url: 'https://ktglbuc.sharepoint.com/:x:/s/KAPTechnologyTeam/EZ77WdbGtP1Ds5l8Y9G4p7sBWfwPnlJYRX1k254A4jWjeA?e=wkqJrk',
            status: 'online',
            priority: 'medium',
            color: '#00cec9'
        },
        {
            id: 'tesseract',
            label: 'Tesseract Platform',
            description: 'Advanced Analytics • Machine learning and AI processing',
            icon: 'analytics',
            category: 'analytics',
            url: 'https://tesseract.kantar.com/dashboard',
            status: 'online',
            priority: 'high',
            color: '#6c5ce7'
        },
        {
            id: 'gls',
            label: 'GLS Platform',
            description: 'Global Logistics System • Content group management',
            icon: 'utilities',
            category: 'utilities',
            url: 'https://gls.kantar.com/ui/contentGroup',
            status: 'online',
            priority: 'medium',
            color: '#e17055'
        }
    ];

    const categories = [
        { id: 'all', label: 'All Systems', color: '#ffffff', count: shortcuts.length },
        { id: 'sandbox', label: 'Sandbox', color: '#00ff87', count: shortcuts.filter(s => s.category === 'sandbox').length },
        { id: 'control', label: 'Mission Control', color: '#ff9f43', count: shortcuts.filter(s => s.category === 'control').length },
        { id: 'ai', label: 'Affectiva', color: '#a29bfe', count: shortcuts.filter(s => s.category === 'ai').length },
        { id: 'data', label: 'Link DB', color: '#00cec9', count: shortcuts.filter(s => s.category === 'data').length },
        { id: 'survey', label: 'Nfield', color: '#55efc4', count: shortcuts.filter(s => s.category === 'survey').length },
        { id: 'analytics', label: 'Analytics', color: '#e84393', count: shortcuts.filter(s => s.category === 'analytics').length },
        { id: 'production', label: 'Production', color: '#00b894', count: shortcuts.filter(s => s.category === 'production').length },
        { id: 'support', label: 'Support', color: '#ffeaa7', count: shortcuts.filter(s => s.category === 'support').length },
        { id: 'utilities', label: 'Utilities', color: '#81ecec', count: shortcuts.filter(s => s.category === 'utilities').length }
    ];

    // Filter shortcuts
    const filteredShortcuts = shortcuts.filter(shortcut => {
        const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
        const matchesSearch = shortcut.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shortcut.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Handle mouse movement for holographic effects
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePosition({
                    x: (e.clientX - rect.left) / rect.width,
                    y: (e.clientY - rect.top) / rect.height
                });
            }
        };

        if (isOpen) {
            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }
    }, [isOpen]);


    const handleShortcutClick = async (shortcut: ShortcutItem) => {
        try {

            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('plugin:shell|open', {
                    path: shortcut.url
                });
                console.log(`✅ Opened ${shortcut.label} via Tauri`);
                return;
            } catch (tauriError) {
                console.log('Tauri not available, using web fallback...');
            }


            const opened = window.open(shortcut.url, '_blank', 'noopener,noreferrer');

            if (opened) {
                console.log(`✅ Opened ${shortcut.label} via web`);
                return;
            }


            await copyUrlWithNotification(shortcut);

        } catch (error) {
            console.error('Error opening URL:', error);
            await copyUrlWithNotification(shortcut);
        }
    };


    const copyUrlWithNotification = async (shortcut: ShortcutItem) => {
        try {
            await navigator.clipboard.writeText(shortcut.url);


            const notification = document.createElement('div');
            notification.innerHTML = `
        <div style="
          position: fixed;
          top: 24px;
          right: 24px;
          background: linear-gradient(135deg, 
            rgba(108, 92, 231, 0.95) 0%, 
            rgba(255, 107, 157, 0.95) 100%);
          backdrop-filter: blur(20px);
          color: white;
          padding: 20px 24px;
          border-radius: 16px;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 
            0 20px 60px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.1);
          z-index: 999999;
          max-width: 320px;
          border: 2px solid rgba(255,255,255,0.2);
          animation: slideInRight 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
          transform-origin: right center;
        ">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="
              width: 32px; 
              height: 32px; 
              background: rgba(255,255,255,0.2); 
              border-radius: 8px; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              font-size: 16px;
            ">🔗</div>
            <div>
              <div style="font-weight: 700; font-size: 15px;">URL Copied!</div>
              <div style="opacity: 0.8; font-size: 13px;">${shortcut.label}</div>
            </div>
          </div>
          <div style="
            font-size: 12px; 
            opacity: 0.7; 
            font-weight: 500;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255,255,255,0.1);
          ">
            Paste in your browser to open
          </div>
        </div>
      `;


            if (!document.getElementById('notification-styles')) {
                const styles = document.createElement('style');
                styles.id = 'notification-styles';
                styles.textContent = `
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(100%) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
          
          @keyframes slideOutRight {
            from {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
            to {
              opacity: 0;
              transform: translateX(100%) scale(0.8);
            }
          }
        `;
                document.head.appendChild(styles);
            }

            document.body.appendChild(notification);


            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 4000);

        } catch (clipboardError) {
            console.error('Clipboard failed:', clipboardError);

            alert(`Please open manually:\n\n${shortcut.label}\n${shortcut.url}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="shortcuts-nexus-overlay" onClick={onClose}>
            <div
                className="shortcuts-nexus-container"
                ref={containerRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    '--mouse-x': mousePosition.x,
                    '--mouse-y': mousePosition.y
                } as React.CSSProperties}
            >
                {/* Header */}
                <div className="shortcuts-header">
                    <div className="shortcuts-header-content">
                        <div className="shortcuts-header-title">
                            <div className="title-icon">
                                <svg viewBox="0 0 24 24" fill="none" className="header-svg">
                                    <path
                                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                        stroke="url(#headerGradient)"
                                        strokeWidth="2"
                                        fill="none"
                                    />
                                    <defs>
                                        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#6c5ce7" />
                                            <stop offset="50%" stopColor="#ff6b9d" />
                                            <stop offset="100%" stopColor="#00ff87" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <h1 className="title-text">
                                <span className="title-main">SHORTCUTS</span>
                                <span className="title-sub">NEXUS</span>
                            </h1>
                        </div>

                        <div className="header-stats">
                            <div className="shortcuts-stat-item">
                                <span className="shortcuts-stat-value">{filteredShortcuts.length}</span>
                                <span className="shortcuts-stat-label">ACTIVE</span>
                            </div>
                            <div className="stat-divider"></div>
                            <div className="shortcuts-stat-item">
                                <span className="shortcuts-stat-value">{shortcuts.filter(s => s.status === 'online').length}</span>
                                <span className="shortcuts-stat-label">ONLINE</span>
                            </div>
                        </div>
                    </div>

                    <button className="shortcuts-close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="shortcuts-controls">
                    <div className="search-container">
                        <div className="shortcuts-search-input-wrapper">
                            <svg className="shortcuts-search-icon" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type="text"
                                className="shortcuts-search-input"
                                placeholder="Search quantum portals..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    className="search-clear"
                                    onClick={() => setSearchTerm('')}
                                >
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="categories-container">
                        <div className="categories-scroll">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(category.id)}
                                    style={{
                                        '--category-color': category.color
                                    } as React.CSSProperties}
                                >
                                    <span className="chip-label">{category.label}</span>
                                    <span className="chip-count">{category.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Shortcuts Grid */}
                <div className="shortcuts-grid">
                    {filteredShortcuts.map((shortcut, index) => (
                        <div
                            key={shortcut.id}
                            className={`shortcut-card ${hoveredItem === shortcut.id ? 'hovered' : ''}`}
                            style={{
                                '--shortcut-color': shortcut.color,
                                '--animation-delay': `${index * 0.05}s`
                            } as React.CSSProperties}
                            onMouseEnter={() => setHoveredItem(shortcut.id)}
                            onMouseLeave={() => setHoveredItem('')}
                            onClick={() => handleShortcutClick(shortcut)}
                        >


                            {/* Priority Badge */}
                            {shortcut.priority === 'high' && (
                                <div className="priority-badge">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                            fill="currentColor" />
                                    </svg>
                                </div>
                            )}

                            {/* Icon Container */}
                            <div className="shortcut-icon-container">
                                <div className="icon-wrapper">
                                    {NeonIcons[shortcut.icon as keyof typeof NeonIcons]?.(shortcut.color)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="shortcut-content">
                                <h3 className="shortcut-title">{shortcut.label}</h3>
                                <p className="shortcut-description">{shortcut.description}</p>
                            </div>

                            {/* Launch Button */}
                            <div className="launch-button">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>LAUNCH</span>
                            </div>

                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredShortcuts.length === 0 && (
                    <div className="shortcuts-empty-state">
                        <div className="shortcuts-empty-icon">
                            <svg viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <h3 className="empty-title">No quantum portals found</h3>
                        <p className="empty-description">
                            Try adjusting your search terms or category filters to discover more pathways to the digital realm.
                        </p>
                        <button
                            className="empty-action"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                            }}
                        >
                            Reset Filters
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="shortcuts-footer">
                    <div className="footer-content">
                        <div className="footer-stats">
                            <span className="stat">
                                <span className="stat-number">{shortcuts.length}</span>
                                <span className="stat-text">Total Portals</span>
                            </span>
                            <span className="stat-separator">•</span>
                            <span className="stat">
                                <span className="stat-number">{categories.length - 1}</span>
                                <span className="stat-text">Categories</span>
                            </span>
                            <span className="stat-separator">•</span>
                            <span className="stat">
                                <span className="stat-number">{shortcuts.filter(s => s.status === 'online').length}</span>
                                <span className="stat-text">Online</span>
                            </span>
                        </div>

                        <div className="footer-signature">
                            <span className="signature-text">KAPTOOLS NEXUS</span>
                            <div className="signature-version">v2.0.0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsNexus;
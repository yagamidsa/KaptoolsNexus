import React, { useState, useRef, useEffect } from 'react';
import './NeonDock.css';

interface DockApp {
    id: string;
    name: string;
    icon: string;
    color: string;
    action: () => void;
}

const NeonDock: React.FC = () => {
    const [hoveredApp, setHoveredApp] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const dockRef = useRef<HTMLDivElement>(null);

    const openUrl = (url: string) => {
        window.open(url, '_blank');
    };

    const openLocalApp = async (path: string) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('open_folder', { path });
        } catch (error) {
            console.error('Error opening app:', error);
        }
    };

    const dockApps: DockApp[] = [
        {
            id: 'dev',
            name: 'Azure DevOps',
            icon: 'devops',
            color: '#0078d4',
            action: () => openUrl('https://kantarware.visualstudio.com/Kantar%20Automation%20Platform')
        },
        {
            id: 'vscode',
            name: 'Visual Studio Code',
            icon: 'vscode',
            color: '#007acc',
            action: async () => {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    try {
                        await invoke('open_folder', { path: 'code .' });
                    } catch (error) {
                        try {
                            await invoke('open_folder', { path: 'C:\\Users\\' + window.navigator.userAgent.split('Windows NT')[1]?.split(';')[0] + '\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' });
                        } catch (error2) {
                            await invoke('open_folder', { path: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' });
                        }
                    }
                } catch (error) {
                    console.error('Error opening VS Code:', error);
                    window.open('https://code.visualstudio.com/', '_blank');
                }
            }
        },
        {
            id: 'wiki',
            name: 'Documentation Wiki',
            icon: 'wiki',
            color: '#ff6b9d',
            action: () => openUrl('https://kantarware.visualstudio.com/Kantar%20Automation%20Platform/_wiki/wikis/Kantar%20Automation%20Platform.wiki/15662/Outputs')
        },
        {
            id: 'token',
            name: 'Azure Key Vault',
            icon: 'keyvault',
            color: '#0078d4',
            action: () => openUrl('https://portal.azure.com/#@kantar.com/resource/subscriptions/3223fba8-3a69-4434-a27c-d0492e28d64c/resourceGroups/Kap-Content-Common/providers/Microsoft.KeyVault/vaults/Kap-Token-Vault/secrets')
        },
        {
            id: 'dp',
            name: 'KAP Data Processing',
            icon: 'folder',
            color: '#ffa500',
            action: () => openLocalApp('\\\\mbaw1fs.grpit.local\\KAP_OUTPUTS\\KAPDataProcessing')
        },
        {
            id: 'sd',
            name: 'SA Distribution',
            icon: 'distribution',
            color: '#28a745',
            action: () => openLocalApp('\\\\mbaw1fs.grpit.local\\SA_Distribution\\KAP')
        },
        {
            id: 'ab',
            name: 'ActiveBatch Scheduler',
            icon: 'scheduler',
            color: '#6f42c1',
            action: async () => {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('open_folder', { path: 'C:\\Program Files (x86)\\ASCI\\ActiveBatchV11\\AbatAdmin.EXE' });
                } catch (error) {
                    console.error('Error opening ActiveBatch:', error);
                }
            }
        },
        {
            id: 'excel',
            name: 'Microsoft Excel',
            icon: 'excel',
            color: '#217346',
            action: async () => {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('open_folder', { path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE' });
                } catch (error) {
                    console.error('Error opening Excel:', error);
                }
            }
        },
        {
            id: 'txt',
            name: 'TextPad Editor',
            icon: 'texteditor',
            color: '#dc3545',
            action: async () => {
                try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    await invoke('open_folder', { path: 'C:\\Program Files\\TextPad 7\\TextPad.exe' });
                } catch (error) {
                    console.error('Error opening TextPad:', error);
                }
            }
        }
    ];

    
    const calculateTooltipPosition = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const tooltipX = rect.right + 20; 
        const tooltipY = rect.top + (rect.height / 2); 

        setTooltipPosition({ x: tooltipX, y: tooltipY });
    };

    
    const handleMouseEnter = (appId: string, event: React.MouseEvent<HTMLDivElement>) => {
        const element = event.currentTarget;
        calculateTooltipPosition(element);
        setHoveredApp(appId);
    };

    const handleMouseLeave = () => {
        setHoveredApp(null);
    };

    const getSvgIcon = (iconType: string, color: string) => {
        const icons: { [key: string]: string } = {
            devops: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M8 10L12 8L16 10L12 12L8 10Z" fill="${color}"/>
          <path d="M8 14L12 12L16 14L12 16L8 14Z" fill="${color}" opacity="0.7"/>
          <circle cx="12" cy="6" r="1" fill="${color}"/>
        </svg>
      `,
            vscode: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18.5 2L6.5 14L2.5 10.5L0.5 12L6.5 18L20.5 4L18.5 2Z" fill="${color}"/>
          <rect x="3" y="6" width="18" height="12" rx="2" stroke="${color}" strokeWidth="2" fill="none"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="${color}" strokeWidth="1"/>
          <circle cx="6" cy="8" r="0.5" fill="${color}"/>
          <circle cx="8" cy="8" r="0.5" fill="${color}"/>
          <circle cx="10" cy="8" r="0.5" fill="${color}"/>
        </svg>
      `,
            wiki: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 4H20C20.5523 4 21 4.44772 21 5V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V5C3 4.44772 3.44772 4 4 4Z" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M3 8H21" stroke="${color}" strokeWidth="2"/>
          <path d="M7 12H17" stroke="${color}" strokeWidth="1.5" opacity="0.7"/>
          <path d="M7 16H17" stroke="${color}" strokeWidth="1.5" opacity="0.7"/>
          <path d="M7 6L9 6" stroke="${color}" strokeWidth="2"/>
        </svg>
      `,
            keyvault: `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="8" rx="2" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="${color}" strokeWidth="2" fill="none"/>
          <circle cx="12" cy="15" r="2" fill="${color}"/>
          <path d="M12 17L12 18" stroke="${color}" strokeWidth="2"/>
          <circle cx="6" cy="6" r="1" fill="${color}" opacity="0.5"/>
          <circle cx="18" cy="6" r="1" fill="${color}" opacity="0.5"/>
        </svg>
      `,
            folder: `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 7V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7H11L9 5H5C3.89543 5 3 5.89543 3 7Z" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M3 7H21" stroke="${color}" strokeWidth="2"/>
          <rect x="7" y="10" width="10" height="6" rx="1" fill="${color}" opacity="0.3"/>
          <line x1="9" y1="12" x2="15" y2="12" stroke="${color}" strokeWidth="1"/>
          <line x1="9" y1="14" x2="13" y2="14" stroke="${color}" strokeWidth="1"/>
        </svg>
      `,
            distribution: `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M12 9L12 3M12 21L12 15M15 12L21 12M3 12L9 12" stroke="${color}" strokeWidth="2"/>
          <circle cx="12" cy="3" r="1" fill="${color}"/>
          <circle cx="12" cy="21" r="1" fill="${color}"/>
          <circle cx="21" cy="12" r="1" fill="${color}"/>
          <circle cx="3" cy="12" r="1" fill="${color}"/>
          <path d="M18 6L6 18M6 6L18 18" stroke="${color}" strokeWidth="1" opacity="0.3"/>
        </svg>
      `,
            scheduler: `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M12 7L12 12L16 16" stroke="${color}" strokeWidth="2"/>
          <circle cx="12" cy="12" r="1" fill="${color}"/>
          <path d="M12 3V1M12 23V21M21 12H23M1 12H3" stroke="${color}" strokeWidth="1"/>
          <path d="M18.36 5.64L19.78 4.22M4.22 19.78L5.64 18.36M18.36 18.36L19.78 19.78M4.22 4.22L5.64 5.64" stroke="${color}" strokeWidth="1" opacity="0.5"/>
        </svg>
      `,
            excel: `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M3 7H21M3 11H21M3 15H21M7 3V21M11 3V21M15 3V21" stroke="${color}" strokeWidth="1"/>
          <rect x="8" y="8" width="2" height="2" fill="${color}" opacity="0.7"/>
          <rect x="12" y="8" width="2" height="2" fill="${color}" opacity="0.5"/>
          <rect x="16" y="8" width="2" height="2" fill="${color}" opacity="0.3"/>
          <path d="M5 19L19 5" stroke="${color}" strokeWidth="0.5" opacity="0.3"/>
        </svg>
      `,
            texteditor: `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="${color}" strokeWidth="2" fill="none"/>
          <path d="M7 7H17M7 11H17M7 15H13" stroke="${color}" strokeWidth="1.5"/>
          <circle cx="16" cy="16" r="2" stroke="${color}" strokeWidth="1.5" fill="none"/>
          <path d="M15 17L14 18" stroke="${color}" strokeWidth="1.5"/>
          <rect x="2" y="5" width="3" height="1" fill="${color}" opacity="0.5"/>
        </svg>
      `
        };

        return icons[iconType] || icons.folder;
    };

    const handleAppClick = (app: DockApp) => {
        app.action();
        
        if (window.innerWidth < 1200) {
            setIsExpanded(false);
        }
    };

    const getAppDescription = (appId: string): string => {
        const descriptions: { [key: string]: string } = {
            'dev': 'Azure DevOps Portal • Project Management & CI/CD',
            'vscode': 'Visual Studio Code • Advanced Code Editor',
            'wiki': 'KAP Documentation • Knowledge Base & Guides',
            'token': 'Azure Key Vault • Security Tokens & Secrets',
            'dp': 'KAP Data Processing • File Management & Analytics',
            'sd': 'SA Distribution Hub • File Sharing & Deployment',
            'ab': 'ActiveBatch Scheduler • Automated Task Management',
            'excel': 'Microsoft Excel • Spreadsheets & Data Analysis',
            'txt': 'TextPad Editor • Advanced Text Processing'
        };
        return descriptions[appId] || 'Application';
    };

    const toggleDock = () => {
        setIsExpanded(!isExpanded);
    };

    
    const TooltipPortal: React.FC<{ app: DockApp }> = ({ app }) => {
        if (!hoveredApp || hoveredApp !== app.id) return null;

        return (
            <div
                className="global-tooltip"
                style={{
                    position: 'fixed',
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: 'translateY(-50%)',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.98) 0%, rgba(25, 25, 35, 0.95) 100%)',
                    border: `2px solid ${app.color}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    boxShadow: `
                        0 20px 60px rgba(0, 0, 0, 0.9),
                        0 0 40px ${app.color},
                        0 0 80px rgba(108, 92, 231, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `,
                    backdropFilter: 'blur(30px)',
                    minWidth: '240px',
                    maxWidth: '320px',
                    color: 'white',
                    animation: 'tooltip-appear 0.3s ease-out forwards'
                }}
            >
                <div
                    style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        marginBottom: '8px',
                        background: `linear-gradient(135deg, #ffffff 0%, ${app.color} 50%, #ffffff 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    {app.name}
                </div>
                <div
                    style={{
                        color: 'rgba(180, 183, 200, 0.95)',
                        fontSize: '13px',
                        fontWeight: 500,
                        lineHeight: 1.5
                    }}
                >
                    {getAppDescription(app.id)}
                </div>
                
                <div
                    style={{
                        position: 'absolute',
                        left: '-12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '12px solid transparent',
                        borderBottom: '12px solid transparent',
                        borderRight: `12px solid ${app.color}`,
                        filter: 'drop-shadow(-6px 0 12px rgba(0, 0, 0, 0.7))'
                    }}
                />
            </div>
        );
    };

    
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tooltip-appear {
                from {
                    opacity: 0;
                    transform: translateY(-50%) translateX(-20px) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translateY(-50%) translateX(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <>
            
            <button
                className={`dock-toggle ${isExpanded ? 'expanded' : ''}`}
                onClick={toggleDock}
                title={isExpanded ? 'Cerrar Apps' : 'Abrir Apps'}
            >
                <span className="toggle-icon">
                    {isExpanded ? '✕' : '⚡'}
                </span>
                {!isExpanded && (
                    <span className="toggle-label">APPS</span>
                )}
            </button>

            
            {isExpanded && (
                <div
                    className="dock-overlay"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            
            <div
                ref={dockRef}
                className={`neon-dock ${isExpanded ? 'expanded' : 'collapsed'}`}
            >
                <div className="dock-container">
                    <div className="dock-header">
                        <div className="dock-title">
                            <span className="dock-icon">⚡</span>
                            <span className="dock-text">APPS</span>
                        </div>
                    </div>

                    <div className="dock-apps">
                        {dockApps.map((app) => (
                            <div
                                key={app.id}
                                className={`dock-app ${hoveredApp === app.id ? 'hovered' : ''}`}
                                onMouseEnter={(e) => handleMouseEnter(app.id, e)}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => handleAppClick(app)}
                                style={{
                                    '--app-color': app.color
                                } as React.CSSProperties}
                            >
                                <div
                                    className="app-icon"
                                    dangerouslySetInnerHTML={{
                                        __html: getSvgIcon(app.icon, app.color)
                                    }}
                                />

                                
                                <div className="app-glow"></div>

                                
                                <div className="app-particles">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className={`particle particle-${i + 1}`}></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="dock-footer">
                        <div className="dock-status">
                            <div className="status-dot"></div>
                            <span>READY</span>
                        </div>
                    </div>
                </div>
            </div>

            
            {dockApps.map((app) => (
                <TooltipPortal key={`tooltip-${app.id}`} app={app} />
            ))}
        </>
    );
};

export default NeonDock;
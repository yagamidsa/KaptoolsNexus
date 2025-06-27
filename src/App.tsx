import { useState, useEffect } from "react";
import HolographicButton from "./components/HolographicButton";
import FuturisticBackground from "./components/FuturisticBackground";
import NeonDock from "./components/NeonDock";
import PostItNotes from './components/PostItNotes';
import ReviewBranches from "./components/ReviewBranches";
import DownloadFiles from "./components/DownloadFiles";
import ProductData from './components/ProductData';
import DuplicateMDD from './components/DuplicateMDD';
import CreateStructure from './components/CreateStructure';
import ShortcutsNexus from './components/ShorcutsNexus';
import { SmartTooltipWrapper } from './components/SmartTooltipWrapper';
import './components/style/SmartTooltip.css';
import QChunksProcessor from './components/QChunksProcessor';
import SplashScreen from './components/SplashScreen';
import { useExchangeRates } from './hooks/useExchangeRates';
import ExchangeRateDisplay from './components/ExchangeRate';
import './utils/test_backend.js';
import JSONPathTool from './components/JSONPathTool';
import ProductChunksModal from './components/ProductChunksModal';
import "./App.css";
import copilotIcon from './assets/copilot.png';
import Dashboard from './components/Dashboard';

interface MenuItem {
  id: string;
  label: string;
  desc: string;
  icon: string;
  category: string;
  requiresWorkspace?: boolean;
  requiresMicroservices?: boolean;
}



interface WorkspaceValidation {
  valid: boolean;
  has_microservices: boolean;
  existing_repos: string[];
  workspace_path: string;
}

function App() {

  const [isAppLoading, setIsAppLoading] = useState(() => {
    // Solo mostrar splash en inicio real, no después de reposo
    return !sessionStorage.getItem('app-initialized');
  });

  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [activeView, setActiveView] = useState<'main' | 'review-branches' | 'jsonpath'>('main');


  const [showPostItNotesModal, setShowPostItNotesModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showProductDataModal, setShowProductDataModal] = useState(false);
  const [showDuplicateMDDModal, setShowDuplicateMDDModal] = useState(false);
  const [showCreateStructureModal, setShowCreateStructureModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQChunksModal, setShowQChunksModal] = useState(false);
  const [showProductChunksModal, setShowProductChunksModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const [workspaceValidation, setWorkspaceValidation] = useState<WorkspaceValidation>({
    valid: false,
    has_microservices: false,
    existing_repos: [],
    workspace_path: ''
  });


  const { exchangeRates } = useExchangeRates();

  const menuItems: MenuItem[] = [

    {
      id: 'clone-master',
      label: 'Clone Repos (Master)',
      desc: 'Deploy microservices master',
      icon: '🔔',
      category: 'GIT OPERATIONS',
      requiresWorkspace: true
    },
    {
      id: 'review-branches',
      label: 'Review Branches',
      desc: 'Analyze git branches',
      icon: '🌿',
      category: 'GIT OPERATIONS',
      requiresWorkspace: true,
      requiresMicroservices: true
    },


    {
      id: 'azure-download',
      label: 'Download Files',
      desc: 'BEE, CeV and Link',
      icon: '📡',
      category: 'AZURE TOOLS',
      requiresWorkspace: true
    },
    {
      id: 'product-data',
      label: 'Product Data',
      desc: 'Review products',
      icon: '🔓',
      category: 'AZURE TOOLS'
    },
    {
      id: 'product-chunks',
      label: 'Product Chunks',
      desc: 'Download JSON and Chunks Manipulation',
      icon: '🔬',
      category: 'AZURE TOOLS',
      requiresWorkspace: true,
      requiresMicroservices: true
    },


    {
      id: 'duplicate-mdd',
      label: 'Duplicate MDD',
      desc: 'Duplicate base files',
      icon: '✨',
      category: 'DATA PROCESSING',
      requiresWorkspace: true
    },
    {
      id: 'create-structure',
      label: 'Create Structure',
      desc: 'Project scaffolding',
      icon: '🏗️',
      category: 'DATA PROCESSING',
      requiresWorkspace: true,
      requiresMicroservices: true
    },


    {
      id: 'post-it-notes',
      label: 'Post-it Notes',
      desc: 'Digital sticky notes',
      icon: '📌',
      category: 'UTILITIES'
    },
    {
      id: 'jsonpath',
      label: 'JsonPath Tool',
      desc: 'JSON query tool',
      icon: '🔗',
      category: 'UTILITIES'
    },
    {
      id: 'q-chunks-processor',
      label: 'ODIN Chunks Processor',
      desc: 'Process .odin files and generate chunks',
      icon: '⚙️',
      category: 'UTILITIES',
      requiresWorkspace: true
    },
    {
      id: 'shortcuts',
      label: 'Command Shortcuts',
      desc: 'Divine portal matrix',
      icon: '🌐',
      category: 'UTILITIES'
    }
  ];

  const categories = [...new Set(menuItems.map(item => item.category))];


  const isWorkspaceSelected = workspacePath !== '';


  const handleSplashComplete = () => {
    console.log("✅ Splash screen completed!");
    setIsAppLoading(false);
    setResponse("🚀 KapTools Nexus successfully loaded!\n✨ All Command systems online and ready");
  };

  useEffect(() => {
    if (!isAppLoading) {
      sessionStorage.setItem('app-initialized', 'true');
    }
  }, [isAppLoading]);

  const getTooltipContent = (item: MenuItem, enabled: boolean) => {
    if (enabled) {
      return {
        icon: '✅',
        message: `Ready to execute`,
        detail: `${item.desc}`,
        type: 'success' as const
      };
    }

    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return {
        icon: '📁',
        message: `Requires workspace selection`,
        detail: 'Select workspace folder first',
        type: 'warning' as const
      };
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return {
        icon: '🌿',
        message: `Requires microservices`,
        detail: 'Clone microservices first',
        type: 'error' as const
      };
    }

    return {
      icon: 'ℹ️',
      message: `${item.desc}`,
      detail: 'Click to execute',
      type: 'info' as const
    };
  };


  useEffect(() => {
    if (isWorkspaceSelected) {
      validateWorkspace();
    } else {
      setWorkspaceValidation({
        valid: false,
        has_microservices: false,
        existing_repos: [],
        workspace_path: ''
      });
    }
  }, [workspacePath]);



  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeView === 'jsonpath') {
        setActiveView('main');
        setSelectedItem('');
        setResponse('🔗 JSONPath Tool closed');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeView]);


  const handleCloseJSONPath = () => {
    setActiveView('main');
    setSelectedItem('');
    setResponse('🔗 JSONPath Tool closed');
  };


  useEffect(() => {
    const handleF4Key = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        console.log('🔑 F4 pressed - toggling dashboard');

        if (showDashboard) {
          // ✅ FIX: Si está abierto, cerrarlo
          setShowDashboard(false);
          setResponse('📊 KAPTools Dashboard closed');
          console.log('📊 Dashboard closed via F4');
        } else {
          // ✅ FIX: Si está cerrado, abrirlo
          setShowDashboard(true);
          setResponse('📊 KAPTools Dashboard opened - Press F4 to close');
          console.log('📊 Dashboard opened via F4');
        }
      }
    };

    document.addEventListener('keydown', handleF4Key);
    return () => document.removeEventListener('keydown', handleF4Key);
  }, [showDashboard]);

  const handleCloseDashboard = () => {
    setShowDashboard(false);
    setSelectedItem('');
    setResponse('📊 KAPTools Dashboard closed');
    console.log('📊 Dashboard closed via close button');
  };


  const validateWorkspace = async () => {
    if (!workspacePath || workspacePath.trim() === '') {
      setResponse('❌ No workspace path to validate');
      return;
    }

    try {
      setResponse("🔄 Validating workspace...");
      console.log('Validating workspace:', workspacePath);


      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const localValidation = await invoke('check_workspace_folders', {
          workspacePath: workspacePath
        }) as any;

        console.log('Local validation result:', localValidation);


        if (localValidation && localValidation.has_microservices) {
          setWorkspaceValidation({
            valid: true,
            has_microservices: true,
            existing_repos: localValidation.existing_repos || [],
            workspace_path: workspacePath
          });

          setResponse(`✅ Workspace validated locally!\n📂 Path: ${workspacePath}\n🌿 Found repositories: ${localValidation.existing_repos.join(', ')}\n📁 Contents: ${localValidation.details.workspace_contents.join(', ')}`);
          return;
        } else {

          const details = localValidation.details || {};
          setResponse(`📂 Workspace validated: ${workspacePath}\n⚠️ No microservices found\n\nDetails:\n• Content folder exists: ${details.content_folder_exists ? '✅' : '❌'}\n• Content is git repo: ${details.content_is_git_repo ? '✅' : '❌'}\n• Dimensions folder exists: ${details.dimensions_folder_exists ? '✅' : '❌'}\n• Dimensions is git repo: ${details.dimensions_is_git_repo ? '✅' : '❌'}\n• Workspace contents: ${details.workspace_contents?.join(', ') || 'empty'}\n\n💡 Use "Clone Master" to download microservices`);

          setWorkspaceValidation({
            valid: true,
            has_microservices: false,
            existing_repos: [],
            workspace_path: workspacePath
          });
          return;
        }
      } catch (tauriError) {
        console.warn('Local validation failed:', tauriError);
        setResponse("⚠️ Local validation failed, trying backend...");
      }


      try {
        const res = await fetch("http://127.0.0.1:8000/validate-workspace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspace_path: workspacePath }),
        });

        if (res.ok) {
          const validation = await res.json();
          console.log('Backend validation result:', validation);

          setWorkspaceValidation({
            valid: validation.valid || validation.success || false,
            has_microservices: validation.has_microservices || false,
            existing_repos: validation.existing_repos || validation.existing_repositories || [],
            workspace_path: workspacePath
          });

          if (validation.has_microservices) {
            setResponse(`✅ Workspace validated via backend!\n📂 Path: ${workspacePath}\n🌿 Found repositories: ${(validation.existing_repos || []).join(', ')}`);
          } else {
            setResponse(`📂 Workspace ready: ${workspacePath}\n⚠️ No microservices found via backend\n💡 Use "Clone Master" to download microservices`);
          }
        } else {
          const errorText = await res.text();
          throw new Error(`Backend validation failed: ${res.status} - ${errorText}`);
        }
      } catch (backendError) {
        console.warn('Backend validation failed:', backendError);


        setWorkspaceValidation({
          valid: true,
          has_microservices: false,
          existing_repos: [],
          workspace_path: workspacePath
        });

        setResponse(`📂 Workspace path set: ${workspacePath}\n⚠️ Validation services unavailable\n🔧 Backend may not be running\n💡 Start backend: cd backend && python main.py\n\n✅ You can still use basic functions`);
      }

    } catch (error) {
      console.error('Workspace validation error:', error);


      setWorkspaceValidation({
        valid: true,
        has_microservices: false,
        existing_repos: [],
        workspace_path: workspacePath
      });

      setResponse(`⚠️ Validation failed but workspace path set\n📂 Path: ${workspacePath}\n❌ Error: ${error}\n\n💡 You can try:\n• Check the path exists\n• Start the backend\n• Use "Clone Master" if no repos found`);
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setResponse("🔗 Testing Neural Link connection...\n⏳ Initializing backend verification...");

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('test_backend_connection') as string;
      setResponse(result);
    } catch (error) {
      setResponse(`❌ Neural Link connection failed\n\n🔍 Diagnostics:\n• Backend may not be running\n• Port 8000 may be blocked\n• Network connectivity issue\n\n💡 Solutions:\n1. Check if backend process is running\n2. Restart with: ./START-FINAL.bat\n3. Manual start: ./kaptools-backend.exe\n\n🛠️ Debug info: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspaceFolder = async () => {
    try {
      setResponse("🔍 Opening folder selector...");

      const { invoke } = await import('@tauri-apps/api/core');


      const selectedPath = await invoke('select_folder_rfd') as string | null;

      if (selectedPath && selectedPath.trim() !== '') {
        setWorkspacePath(selectedPath);
        setResponse(`📁 Workspace folder selected:\n📁 ${selectedPath}\n🔄 Validating...`);
        console.log('Selected workspace:', selectedPath);


        await validateWorkspace();
      } else {
        setResponse("❌ No folder selected - Operation cancelled");
      }

    } catch (error) {
      console.error('Error selecting folder:', error);
      setResponse(`❌ Folder selector error: ${error}\n💡 Make sure the backend supports RFD folder selection`);
    }
  };




  const openWorkspaceFolder = async () => {
    if (!isWorkspaceSelected) {
      setResponse('❌ Must select workspace first');
      return;
    }

    try {
      setResponse("📂 Opening workspace folder...");

      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke('open_folder', { path: workspacePath }) as string;

      setResponse(`✅ ${result}\n📂 Workspace opened in File Explorer`);
    } catch (error) {
      setResponse(`❌ Error opening folder: ${error}`);
    }
  };

  const cloneMicroservices = async (branch: string = "develop") => {
    if (!isWorkspaceSelected) {
      setResponse('❌ Must select workspace first');
      return;
    }

    setLoading(true);
    setResponse("⚡ Initializing Command git protocols...");

    try {
      const res = await fetch("http://127.0.0.1:8000/git/clone-microservices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_path: workspacePath,
          branch: branch
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(`✅ ${data.message}\n📂 Workspace: ${data.workspace}\n🌿 Branch: ${data.branch}`);
        setTimeout(() => validateWorkspace(), 1000);
      } else {
        setResponse(`❌ Error: ${data.detail}`);
      }
    } catch (error) {
      setResponse("❌ Command connection failed - Backend not available");
    } finally {
      setLoading(false);
    }
  };


  const isMenuItemEnabled = (item: MenuItem): boolean => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return false;
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return false;
    }

    return true;
  };


  const getMenuItemStatusMessage = (item: MenuItem): string => {
    if (item.requiresWorkspace && !isWorkspaceSelected) {
      return "❌ Requires workspace selection";
    }

    if (item.requiresMicroservices && !workspaceValidation.has_microservices) {
      return "⚠️ Requires microservices (clone them first)";
    }

    return "✅ Ready";
  };


  const handleCloseReviewBranches = () => {
    setActiveView('main');
    setSelectedItem('');
    setResponse('📊 Returned to main dashboard');
  };

  const handleCloseDownloadModal = () => {
    setShowDownloadModal(false);
    setSelectedItem('');
    setResponse('☁️ Azure Download Center closed');
  };

  const handleCloseDuplicateMDDModal = () => {
    setShowDuplicateMDDModal(false);
    setSelectedItem('');
    setResponse('📋 MDD Duplicator closed');
  };

  const handleCloseCreateStructureModal = () => {
    setShowCreateStructureModal(false);
    setSelectedItem('');
    setResponse('🏗️ Project Structure Creator closed');
  };

  const handleClosePostItNotesModal = () => {
    setShowPostItNotesModal(false);
    setSelectedItem('');
    setResponse('📝 Post-it Notes closed');
  };


  const handleMenuItemClick = async (itemId: string) => {
    const item = menuItems.find(item => item.id === itemId);
    if (!item) return;


    if (!isMenuItemEnabled(item)) {
      const statusMsg = getMenuItemStatusMessage(item);
      setResponse(`🚫 Cannot execute: ${item.label}\n${statusMsg}`);
      return;
    }

    setSelectedItem(itemId);
    if (itemId === 'post-it-notes') {
      setShowPostItNotesModal(true);
      setResponse(`📝 Opening Post-it Notes...\n🎨 Digital sticky notes ready for organizing your ideas`);
    }

    else if (itemId === 'clone-master') {
      await cloneMicroservices('master');
    } else if (itemId === 'review-branches') {
      setActiveView('review-branches');
      setResponse(`🌿 Opening Review Branches for workspace: ${workspacePath}\n📁 Repositories: ${workspaceValidation.existing_repos.join(', ')}`);
    }

    else if (itemId === 'product-chunks') {
      setShowProductChunksModal(true);
      setResponse(`📊 Opening Product Chunks Processor...\n🔧 Ready to download JSON and generate chunks report`);
    }


    else if (itemId === 'product-data') {
      setShowProductDataModal(true);
      setResponse(`📦 Opening Product Data Inspector...\n📂 Ready to analyze product metadata`);
    } else if (itemId === 'azure-download') {
      setShowDownloadModal(true);
      setResponse(`☁️ Opening Azure Download Center...\n📂 Target: ${workspacePath}`);
    }


    else if (itemId === 'duplicate-mdd') {
      setShowDuplicateMDDModal(true);
      setResponse(`📋 Opening MDD Duplicator...\n📂 Workspace: ${workspacePath}\n🔄 Ready to duplicate and combine files`);
    } else if (itemId === 'create-structure') {
      setShowCreateStructureModal(true);
      setResponse(`🏗️ Opening Project Structure Creator...\n📂 Workspace: ${workspacePath}\n🌿 Microservices: ${workspaceValidation.existing_repos.join(', ')}\n⚡ Ready to deploy Command architecture`);
    } else if (itemId === 'q-chunks-processor') {
      setShowQChunksModal(true);
      setResponse(`⚙️ Opening ODIN Chunks Processor...\n📂 Workspace: ${workspacePath}\n🔧 Ready to process .odin files and generate Template_Chunks structure`);
    }


    else if (itemId === 'shortcuts') {
      setShowShortcutsModal(true);
      setResponse(`🌐 Opening Command Shortcuts Portal...\n⚡ Accessing divine portal matrix`);
    }


    else if (itemId === 'jsonpath') {
      setActiveView('jsonpath');
      setResponse(`🔗 Opening JSONPath Tool...\n🎯 Advanced API querying ready\n⚡ Quantum JSON analysis activated`);
    }

    else {
      setResponse(`🔧 Selected: ${item.label}`);
    }
  };

  const renderMainContent = () => {
    if (activeView === 'review-branches') {
      return (
        <ReviewBranches
          workspacePath={workspacePath}
          onClose={handleCloseReviewBranches}
        />
      );
    }


    if (activeView === 'jsonpath') {
      return (
        <JSONPathTool onClose={handleCloseJSONPath} />
      );
    }


    return (
      <>
        <main className="nexus-main">
          <div className="control-panel">
            <div className="panel-header">
              <div className="panel-icon">🌐</div>
              <h2>Command Control Center</h2>
              <div className="panel-status">
                <div className="status-dot"></div>
                ONLINE
              </div>
            </div>

            <div className="input-matrix">
              <label className="input-label">
                <span className="label-icon">📂</span>
                Workspace Directory Path
              </label>
              <div className="input-container">
                <input
                  type="text"
                  value={workspacePath}
                  onChange={(e) => setWorkspacePath(e.target.value)}
                  className="cyber-input"
                  placeholder="Selected folder path will appear here..."
                />

                <SmartTooltipWrapper
                  content={{
                    icon: '📁',
                    message: 'Select Workspace',
                    detail: 'Open native folder picker to choose your workspace directory',
                    type: 'info'
                  }}
                  enabled={true}
                  delay={300}
                >
                  <button
                    className="input-button"
                    onClick={selectWorkspaceFolder}
                  >
                    📁 Select Folder
                  </button>
                </SmartTooltipWrapper>

                <div className="input-scanner"></div>
              </div>

              {isWorkspaceSelected && (
                <div className="workspace-status-info">
                  <div className={`status-${workspaceValidation.has_microservices ? 'success' : 'warning'}`}>
                    {workspaceValidation.has_microservices ? '✅' : '⚠️'} Workspace: {workspacePath}
                    {workspaceValidation.has_microservices && (
                      <div className="repos-found">
                        🌿 Found repositories: {workspaceValidation.existing_repos.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="input-helper">
                🎯 Click "Select Folder" for native folder picker or type manually
              </div>
            </div>

            <div className="action-matrix">
              <SmartTooltipWrapper
                content={{
                  icon: '🔗',
                  message: 'Neural Link Test',
                  detail: 'Test connection to backend API server on port 8000',
                  type: 'info'
                }}
                enabled={true}
                delay={300}
              >
                <HolographicButton
                  onClick={testAPI}
                  variant="secondary"
                  icon="🔗"
                >
                  Neural Link Test
                </HolographicButton>
              </SmartTooltipWrapper>

              <SmartTooltipWrapper
                content={{
                  icon: !isWorkspaceSelected ? '⚠️' : '✅',
                  message: 'Open Workspace',
                  detail: !isWorkspaceSelected
                    ? 'Select a workspace folder first'
                    : `Open workspace in File Explorer`,
                  type: !isWorkspaceSelected ? 'warning' : 'success'
                }}
                enabled={true}
                delay={300}
              >
                <HolographicButton
                  onClick={openWorkspaceFolder}
                  variant="primary"
                  icon="📂"
                  disabled={!isWorkspaceSelected}
                >
                  Open Workspace
                </HolographicButton>
              </SmartTooltipWrapper>
            </div>

            {response && (
              <div className="response-terminal">
                <div className="terminal-header">
                  <div className="terminal-controls">
                    <div className="control-dot red"></div>
                    <div className="control-dot yellow"></div>
                    <div className="control-dot green"></div>
                  </div>
                  <span className="terminal-title">SYSTEM_OUTPUT.log</span>
                </div>
                <div className="terminal-content">
                  {response.split('\n').map((line, index) => (
                    <div key={index} className="terminal-line">
                      <span className="line-number">{String(index + 1).padStart(3, '0')}</span>
                      <span className="line-content">{line}</span>
                    </div>
                  ))}
                  <div className="terminal-cursor">▋</div>
                </div>
              </div>
            )}

            {selectedItem && activeView === 'main' && (
              <div className="selected-item-info">
                <div className="info-header">
                  <span className="info-icon">
                    {menuItems.find(item => item.id === selectedItem)?.icon}
                  </span>
                  <h3>{menuItems.find(item => item.id === selectedItem)?.label}</h3>
                </div>
                <p>{menuItems.find(item => item.id === selectedItem)?.desc}</p>

                {(() => {
                  const item = menuItems.find(item => item.id === selectedItem);
                  if (!item) return null;

                  const enabled = isMenuItemEnabled(item);

                  if (!enabled) {
                    return (
                      <div className="status-warning">
                        Item not available - check requirements
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            )}
          </div>

          <aside className="main-menu">
            <div className="menu-header">
              <div className="menu-icon">⚡</div>
              <h3>OPERATIONS</h3>
            </div>

            {categories.map(category => (
              <div key={category} className="menu-section">
                <div className="section-title">{category}</div>

                {menuItems
                  .filter(item => item.category === category)
                  .map(item => {
                    const enabled = isMenuItemEnabled(item);
                    const tooltipContent = getTooltipContent(item, enabled);

                    return (
                      <SmartTooltipWrapper
                        key={item.id}
                        content={tooltipContent}
                        enabled={true}
                        delay={400}
                      >
                        <div
                          className={`menu-item ${selectedItem === item.id ? 'active' : ''} ${!enabled ? 'disabled' : ''}`}
                          onClick={() => handleMenuItemClick(item.id)}
                        >
                          <div className="item-icon">{item.icon}</div>
                          <div className="item-info">
                            <div className="item-label">{item.label}</div>
                            <div className="item-desc">{item.desc}</div>
                          </div>
                          <div className="item-status">
                            <div className={`status-indicator ${selectedItem === item.id ? 'active' :
                              enabled ? 'ready' : 'disabled'
                              }`}></div>
                          </div>

                          {(item.requiresWorkspace || item.requiresMicroservices) && (
                            <div className="item-requirements">
                              {item.requiresWorkspace && (
                                <span className={`req-badge ${isWorkspaceSelected ? 'met' : 'unmet'}`}>
                                  📁
                                </span>
                              )}
                              {item.requiresMicroservices && (
                                <span className={`req-badge ${workspaceValidation.has_microservices ? 'met' : 'unmet'}`}>
                                  🌿
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </SmartTooltipWrapper>
                    );
                  })}
              </div>
            ))}
          </aside>
        </main>
      </>
    );
  };


  if (isAppLoading) {
    return <SplashScreen onLoadingComplete={handleSplashComplete} />;
  }


  return (
    <div className={`nexus-app ${activeView === 'review-branches' || activeView === 'jsonpath' ? 'review-branches-mode' : ''}`}>
      <FuturisticBackground />
      <NeonDock />

      <header className="nexus-header">
        <h1 className="nexus-title">
          <span className="title-main">KAPTOOLS</span>
          <div className="title-separator"></div>
          <span className="title-sub">NEXUS</span>
        </h1>
        <div className="title-tagline">KANTAR • KAP • DP</div>

        {activeView === 'review-branches' && (
          <div className="view-indicator">
            <span className="view-icon">🌿</span>
            <span className="view-name">Review Branches</span>
          </div>
        )}

      </header>




      <div className="copilot-floating-button">
        <SmartTooltipWrapper
          content={{
            icon: '🤖',
            message: 'Open Microsoft Copilot 365',
            detail: 'Launch native Microsoft Copilot application for Windows',
            type: 'info'
          }}
          enabled={true}
          delay={300}
        >
          <button
            className="copilot-button"
            onClick={async () => {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('open_copilot_365');
                setResponse('🤖 Opening Microsoft Copilot 365...\n🌐 Launching native Windows application');
              } catch (error) {
                setResponse('❌ Could not open Copilot 365\n💡 Check your internet connection');
              }
            }}
          >
            <img
              src={copilotIcon}
              alt="Microsoft Copilot"
              width="48"
              height="48"
              style={{
                borderRadius: '8px',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}
              onError={() => {
                // Si falla, usar diseño con texto
                const button = document.querySelector('.copilot-button');
                if (button) {
                  button.innerHTML = `
              <div style="
                width: 48px; 
                height: 48px; 
                background: linear-gradient(135deg, #0078D4, #00BCF2); 
                border-radius: 12px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: white; 
                font-size: 14px; 
                font-weight: bold;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
              ">Co</div>
            `;
                }
              }}
            />
          </button>
        </SmartTooltipWrapper>
      </div>


      {renderMainContent()}

      <footer className="nexus-footer">
        <div className="footer-grid">
          <span>•</span>
          <span className="footer-highlight">KapTools Nexus v2.0.0</span>
          <span>•</span>
          <span className="footer-workspace">
            {isWorkspaceSelected ? `📂 ${workspacePath}` : '📂 No workspace'}
          </span>
          <span>•</span>
          <ExchangeRateDisplay exchangeRates={exchangeRates} />
          {activeView === 'review-branches' && (
            <>
              <span className="footer-view">🌿 Review Branches Active</span>
              <span>•</span>
            </>
          )}

          {activeView === 'jsonpath' && (
            <>
              <span className="footer-view">🔗 JSONPath Tool Active</span>
              <span>•</span>
            </>
          )}
        </div>
      </footer>


      <DownloadFiles
        isOpen={showDownloadModal}
        onClose={handleCloseDownloadModal}
        workspacePath={workspacePath}
      />

      <ProductData
        isOpen={showProductDataModal}
        onClose={() => {
          setShowProductDataModal(false);
          setSelectedItem('');
          setResponse('📦 Product Data Inspector closed');
        }}
        workspacePath={workspacePath}
      />

      <DuplicateMDD
        isOpen={showDuplicateMDDModal}
        onClose={handleCloseDuplicateMDDModal}
        workspacePath={workspacePath}
      />

      <CreateStructure
        isOpen={showCreateStructureModal}
        onClose={handleCloseCreateStructureModal}
        workspacePath={workspacePath}
      />

      <QChunksProcessor
        isOpen={showQChunksModal}
        onClose={() => {
          setShowQChunksModal(false);
          setSelectedItem('');
          setResponse('⚙️ ODIN Chunks Processor closed');
        }}
        workspacePath={workspacePath}
      />

      <PostItNotes
        isOpen={showPostItNotesModal}
        onClose={handleClosePostItNotesModal}
        workspacePath={workspacePath}
      />


      {showProductChunksModal && (
        <ProductChunksModal
          isOpen={showProductChunksModal}
          onClose={() => setShowProductChunksModal(false)}
          workspacePath={workspacePath}
        />
      )}

      <ShortcutsNexus
        isOpen={showShortcutsModal}
        onClose={() => {
          setShowShortcutsModal(false);
          setSelectedItem('');
          setResponse('🌐 Command Shortcuts Portal closed');
        }}
      />

      <Dashboard
        isOpen={showDashboard}
        onClose={handleCloseDashboard}
      />

    </div>
  );
}

export default App;
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './ReviewBranches.css';

// ================================
// 🔧 INTERFACES Y TIPOS
// ================================

interface BranchInfo {
    name: string;
    display_name: string;
    author: string;
    author_email: string;
    commit_hash: string;
    commit_message: string;
    date: string;
    repository: 'content' | 'dimensions';
    is_current: boolean;
    commits_ahead: number;
    commits_behind: number;
}

interface ComparisonFile {
    path: string;
    change_type: 'added' | 'deleted' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    old_path?: string;
}

interface BranchComparison {
    branch_name: string;
    base_branch: string;
    repository: string;
    total_files: number;
    total_additions: number;
    total_deletions: number;
    files: ComparisonFile[];
    summary: string;
}

interface FileDiff {
    path: string;
    old_content: string;
    new_content: string;
    diff_lines: DiffLine[];
    change_type: string;
}

interface DiffLine {
    line_number_old?: number;
    line_number_new?: number;
    content: string;
    type: 'added' | 'deleted' | 'context' | 'header';
}

interface ReviewBranchesProps {
    workspacePath: string;
    onClose: () => void;
}

interface RepositoryAvailability {
    content: boolean;
    dimensions: boolean;
}

interface ScreenSize {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;
}

// ================================
// 🛠️ CONFIGURACIÓN DEVOPS
// ================================
const DEVOPS_CONFIG = {
    baseUrl: 'https://kantarware.visualstudio.com/',
    projectName: 'Kantar%20Automation%20Platform',
    repositories: {
        'content': 'outputs-dimensions-content',
        'dimensions': 'outputs-dimensions'
    }
};

// ================================
// 🎯 CUSTOM HOOKS
// ================================
const useScreenSize = (): ScreenSize => {
    const [screenSize, setScreenSize] = useState<ScreenSize>({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false
    });

    useEffect(() => {
        const updateScreenSize = () => {
            const width = window.innerWidth;
            setScreenSize({
                isMobile: width <= 768,
                isTablet: width > 768 && width <= 1024,
                isDesktop: width > 1024 && width <= 1440,
                isLargeDesktop: width > 1440
            });
        };

        updateScreenSize();
        window.addEventListener('resize', updateScreenSize);
        return () => window.removeEventListener('resize', updateScreenSize);
    }, []);

    return screenSize;
};

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// ================================
// 🧩 COMPONENTE PRINCIPAL
// ================================
const ReviewBranches: React.FC<ReviewBranchesProps> = ({ workspacePath, onClose }) => {
    // ================================
    // 📊 ESTADOS PRINCIPALES
    // ================================
    const [branches, setBranches] = useState<BranchInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // ================================
    // 🎛️ ESTADOS DE FILTROS Y BÚSQUEDA
    // ================================
    const [repositoryFilter, setRepositoryFilter] = useState<'both' | 'content' | 'dimensions'>('content');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortBy, setSortBy] = useState<'date' | 'author' | 'name' | 'behind'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // ================================
    // 🗂️ ESTADOS DE MODALES Y COMPARACIÓN
    // ================================
    const [selectedBranch, setSelectedBranch] = useState<BranchInfo | null>(null);
    const [comparison, setComparison] = useState<BranchComparison | null>(null);
    const [showComparison, setShowComparison] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<ComparisonFile | null>(null);
    const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
    const [showFileDiff, setShowFileDiff] = useState<boolean>(false);
    const [loadingFileDiff, setLoadingFileDiff] = useState<boolean>(false);

    // ================================
    // 🏗️ ESTADOS DE CONFIGURACIÓN
    // ================================
    const [availableRepos, setAvailableRepos] = useState<RepositoryAvailability>({
        content: false,
        dimensions: false
    });

    // ================================
    // 🎯 HOOKS PERSONALIZADOS
    // ================================
    const screenSize = useScreenSize();
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // ================================
    // 📱 RESPONSIVE REFS
    // ================================
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const unifiedViewRef = useRef<HTMLDivElement>(null);

    // ================================
    // 🛠️ FUNCIONES HELPER
    // ================================
    const generateDevOpsUrl = useCallback((branch: BranchInfo): string => {
        const repoName = DEVOPS_CONFIG.repositories[branch.repository];
        const branchName = encodeURIComponent(branch.display_name);
        return `${DEVOPS_CONFIG.baseUrl}/${DEVOPS_CONFIG.projectName}/_git/${repoName}?version=GB${branchName}`;
    }, []);

    const openBranchInDevOps = useCallback((branch: BranchInfo) => {
        const url = generateDevOpsUrl(branch);
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [generateDevOpsUrl]);

    const handleBranchNameClick = useCallback((branch: BranchInfo, e: React.MouseEvent) => {
        e.stopPropagation();
        openBranchInDevOps(branch);
    }, [openBranchInDevOps]);

    const getRepositoryBadgeColor = useCallback((repo: string): string => {
        return repo === 'content' ? 'bg-blue-repo' : 'bg-purple-repo';
    }, []);

    const getChangeTypeColor = useCallback((type: string): string => {
        switch (type) {
            case 'added': return 'text-green';
            case 'deleted': return 'text-red';
            case 'modified': return 'text-yellow';
            case 'renamed': return 'text-blue';
            default: return 'text-gray';
        }
    }, []);

    const formatDate = useCallback((dateString: string): string => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            return date.toLocaleDateString();
        } catch {
            return 'Invalid date';
        }
    }, []);

    // ================================
    // 🔄 OPERACIONES ASYNC
    // ================================
    const validateAndLoadBranches = useCallback(async () => {
        if (!workspacePath || workspacePath === 'Path of your workspace') {
            setError('Please select a valid workspace first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('🔍 Validating repositories for workspace:', workspacePath);

            const validateRes = await fetch(
                `http://127.0.0.1:8000/git/validate-repositories?project_path=${encodeURIComponent(workspacePath)}`
            );

            if (!validateRes.ok) {
                const errorText = await validateRes.text().catch(() => 'Unknown error');
                throw new Error(`Validation failed (${validateRes.status}): ${errorText}`);
            }

            const validateData = await validateRes.json();

            if (!validateData.success || !validateData.validation?.valid) {
                throw new Error(validateData.validation?.message || 'Repository validation failed');
            }

            const repositories = validateData.validation.repositories || { content: false, dimensions: false };
            setAvailableRepos(repositories);

            if (!repositories.content && !repositories.dimensions) {
                throw new Error('No repositories are available. Please clone microservices first.');
            }

            const branchesRes = await fetch(
                `http://127.0.0.1:8000/git/branches?project_path=${encodeURIComponent(workspacePath)}&repo=${repositoryFilter}&limit=20`
            );

            if (!branchesRes.ok) {
                const errorText = await branchesRes.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${branchesRes.status}: ${errorText}`);
            }

            const branchesData = await branchesRes.json();

            if (branchesData.success) {
                const branchesArray = Array.isArray(branchesData.branches) ? branchesData.branches : [];
                setBranches(branchesArray);
                setSuccess(`Found ${branchesData.total || branchesArray.length} branches`);
            } else {
                throw new Error(branchesData.message || 'Failed to load branches');
            }

        } catch (err: any) {
            console.error('💥 Error in validateAndLoadBranches:', err);
            setError(`Failed to load branches: ${err.message}`);
            setBranches([]);
        } finally {
            setLoading(false);
        }
    }, [workspacePath, repositoryFilter]);

    const handleCheckout = useCallback(async (branch: BranchInfo) => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/git/checkout?project_path=${encodeURIComponent(workspacePath)}&repo_name=${branch.repository}&branch_name=${encodeURIComponent(branch.display_name)}`,
                { method: 'POST' }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(`✅ Successfully checked out to ${branch.display_name}`);
                await validateAndLoadBranches();
            } else {
                throw new Error(data.message || 'Checkout failed');
            }
        } catch (err: any) {
            setError(`Checkout failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [workspacePath, validateAndLoadBranches]);

    const handleCompare = useCallback(async (branch: BranchInfo) => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/git/compare?project_path=${encodeURIComponent(workspacePath)}&repo_name=${branch.repository}&branch_name=${encodeURIComponent(branch.display_name)}`
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setComparison(data.comparison);
                setSelectedBranch(branch);
                setShowComparison(true);
            } else {
                throw new Error(data.message || 'Comparison failed');
            }
        } catch (err: any) {
            setError(`Comparison failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [workspacePath]);

    const handleFileClick = useCallback(async (file: ComparisonFile) => {
        if (!selectedBranch || !comparison) return;

        setLoadingFileDiff(true);
        setSelectedFile(file);

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/git/file-diff?project_path=${encodeURIComponent(workspacePath)}&repo_name=${selectedBranch.repository}&branch_name=${encodeURIComponent(selectedBranch.display_name)}&file_path=${encodeURIComponent(file.path)}&base_branch=master`
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setFileDiff(data.diff);
                setShowFileDiff(true);
            } else {
                throw new Error(data.message || 'Failed to get file diff');
            }
        } catch (err: any) {
            setError(`Failed to get file diff: ${err.message}`);
        } finally {
            setLoadingFileDiff(false);
        }
    }, [workspacePath, selectedBranch, comparison]);

    const handleRefresh = useCallback(async () => {
        try {
            setLoading(true);
            await fetch(
                `http://127.0.0.1:8000/git/fetch-all?project_path=${encodeURIComponent(workspacePath)}`,
                { method: 'POST' }
            );
        } catch (err) {
            console.warn('⚠️ Fetch failed, but continuing with local branches:', err);
        }
        await validateAndLoadBranches();
    }, [workspacePath, validateAndLoadBranches]);

    // ================================
    // 🔍 FILTRADO Y ORDENAMIENTO OPTIMIZADO
    // ================================
    const filteredAndSortedBranches = useMemo(() => {
        return branches
            .filter(branch => {
                const searchLower = debouncedSearchTerm.toLowerCase();
                return branch.display_name.toLowerCase().includes(searchLower) ||
                    branch.author.toLowerCase().includes(searchLower) ||
                    branch.commit_message.toLowerCase().includes(searchLower);
            })
            .sort((a, b) => {
                let compareValue = 0;

                switch (sortBy) {
                    case 'date':
                        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
                        break;
                    case 'author':
                        compareValue = a.author.localeCompare(b.author);
                        break;
                    case 'name':
                        compareValue = a.display_name.localeCompare(b.display_name);
                        break;
                    case 'behind':
                        compareValue = a.commits_behind - b.commits_behind;
                        break;
                }

                return sortOrder === 'desc' ? -compareValue : compareValue;
            });
    }, [branches, debouncedSearchTerm, sortBy, sortOrder]);

    // ================================
    // ⌨️ KEYBOARD HANDLERS
    // ================================
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showFileDiff) {
                    setShowFileDiff(false);
                } else if (showComparison) {
                    setShowComparison(false);
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showFileDiff, showComparison]);

    // ================================
    // 🔄 EFECTOS DE INICIALIZACIÓN
    // ================================
    useEffect(() => {
        validateAndLoadBranches();
    }, [validateAndLoadBranches]);

    // ================================
    // 🎨 COMPONENTES INTERNOS
    // ================================
    const BranchNameComponent: React.FC<{ branch: BranchInfo }> = React.memo(({ branch }) => (
        <span
            className={`branch-name clickable-branch ${branch.is_current ? 'current-branch' : ''}`}
            onClick={(e) => handleBranchNameClick(branch, e)}
            title={`Open ${branch.display_name} in Azure DevOps`}
        >
            {branch.display_name}
            <span className="devops-link-icon">🔗</span>
        </span>
    ));

    const LoadingSpinner: React.FC = React.memo(() => (
        <div className="loading-state">
            <div className="rb-loading-spinner">
                <div className="loading-spinner-container">
                    <div className="spinner-ring"></div>
                </div>
                <div className="loading-text">Loading branches</div>
                <div className="loading-subtext">Fetching latest Git information...</div>
            </div>
        </div>
    ));

    const EmptyState: React.FC = React.memo(() => (
        <div className="rb-empty-state">
            <span className="rb-empty-icon">🌿</span>
            <h3>No branches found</h3>
            <p>Try adjusting your filters or refresh to get the latest branches</p>
        </div>
    ));

    const StatusMessage: React.FC<{ type: 'error' | 'success'; message: string }> = React.memo(({ type, message }) => (
        <div className={`status-message rb-${type}-message`}>
            <span className="status-icon">{type === 'error' ? '❌' : '✅'}</span>
            {message}
        </div>
    ));

    // ================================
    // 🎯 RENDER PRINCIPAL
    // ================================
    return (
        <div className="review-branches-container">
            {/* ================================
                📋 HEADER SECTION
                ================================ */}
            <div className="branches-header">
                <div className="rb-header-left">
                    <div className="rb-header-icon">🌿</div>
                    <div className="rb-header-info">
                        <h1 className="rb-header-title">Review Branches</h1>
                        <p className="header-subtitle">Manage Git branches across microservices</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="refresh-button"
                        title="Refresh branches"
                        aria-label="Refresh branches"
                    >
                        <span className={`refresh-icon ${loading ? 'spinning' : ''}`}></span>
                    </button>

                    <button
                        onClick={onClose}
                        className="rb-close-button"
                        title="Close Review Branches"
                        aria-label="Close Review Branches"
                    />
                </div>
            </div>

            {/* ================================
                🎛️ CONTROLS SECTION
                ================================ */}
            <div className="branches-controls">
                <div className="controls-left">
                    <div className="filter-group">
                        <label className="filter-label" htmlFor="repo-filter">Repository:</label>
                        <select
                            id="repo-filter"
                            value={repositoryFilter}
                            onChange={(e) => setRepositoryFilter(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="both">Both Repositories</option>
                            <option value="content" disabled={!availableRepos.content}>
                                outputs-dimensions-content {!availableRepos.content ? '(Not Available)' : ''}
                            </option>
                            <option value="dimensions" disabled={!availableRepos.dimensions}>
                                outputs-dimensions {!availableRepos.dimensions ? '(Not Available)' : ''}
                            </option>
                        </select>
                    </div>
                </div>

                <div className="controls-center">
                    <div className="search-group">
                        <div className="rb-search-input-container">
                            <span className="rb-search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder={screenSize.isMobile ? "Search..." : "Search branches, authors, or commits..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="rb-search-input"
                                aria-label="Search branches"
                            />
                        </div>
                    </div>
                </div>

                <div className="controls-right">
                    <div className="sort-group">
                        <label className="filter-label" htmlFor="sort-filter">Sort by:</label>
                        <select
                            id="sort-filter"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="date">Date</option>
                            <option value="author">Author</option>
                            <option value="name">Branch Name</option>
                            <option value="behind">Behind Master</option>
                        </select>

                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="sort-order-button"
                            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                            aria-label={`Toggle sort order: currently ${sortOrder}`}
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ================================
                📊 STATUS MESSAGES
                ================================ */}
            {error && <StatusMessage type="error" message={error} />}
            {success && <StatusMessage type="success" message={success} />}

            {/* ================================
                📡 REPOSITORY STATUS
                ================================ */}
            <div className="repo-status">
                <div className="status-item">
                    <div className={`status-indicator ${availableRepos.content ? 'active' : 'inactive'}`} />
                    <span>{screenSize.isMobile ? 'content' : 'outputs-dimensions-content'}</span>
                </div>
                <div className="status-item">
                    <div className={`status-indicator ${availableRepos.dimensions ? 'active' : 'inactive'}`} />
                    <span>{screenSize.isMobile ? 'dimensions' : 'outputs-dimensions'}</span>
                </div>
                <div className="status-summary">
                    {filteredAndSortedBranches.length} branches found
                </div>
            </div>

            {/* ================================
                📋 BRANCHES TABLE
                ================================ */}
            <div className="branches-table-container">
                {loading ? (
                    <LoadingSpinner />
                ) : filteredAndSortedBranches.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="branches-table">
                        {!screenSize.isMobile && (
                            <div className="table-header">
                                <div className="header-cell branch-cell">Branch</div>
                                <div className="header-cell author-cell">Author</div>
                                <div className="header-cell commit-cell">Last Commit</div>
                                <div className="header-cell date-cell">Date</div>
                                <div className="header-cell behind-cell">Behind</div>
                                <div className="header-cell actions-cell">Actions</div>
                            </div>
                        )}

                        <div className="table-body">
                            {filteredAndSortedBranches.map((branch, index) => (
                                <div key={`${branch.repository}-${branch.name}`} className="table-row">
                                    {/* Branch Info */}
                                    <div className="table-cell branch-cell">
                                        <div className="branch-info">
                                            <div className="branch-main">
                                                <span className="branch-icon">🌿</span>
                                                <BranchNameComponent branch={branch} />
                                                {branch.is_current && <span className="current-badge">CURRENT</span>}
                                            </div>
                                            <div className={`repository-badge ${getRepositoryBadgeColor(branch.repository)}`}>
                                                {branch.repository}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Author Info */}
                                    <div className="table-cell author-cell">
                                        <div className="author-info">
                                            <span className="author-icon">👨‍💻</span>
                                            <span className="author-name">{branch.author}</span>
                                        </div>
                                    </div>

                                    {/* Commit Info */}
                                    <div className="table-cell commit-cell">
                                        <div className="commit-info">
                                            <span className="commit-icon">💻</span>
                                            <div className="commit-details">
                                                <span className="commit-hash">{branch.commit_hash}</span>
                                                {!screenSize.isMobile && (
                                                    <span className="commit-message">{branch.commit_message}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date Info */}
                                    <div className="table-cell date-cell">
                                        <div className="date-info">
                                            <span className="date-icon">🕒</span>
                                            <span>{formatDate(branch.date)}</span>
                                        </div>
                                    </div>

                                    {/* Behind Info */}
                                    <div className="table-cell behind-cell">
                                        <div className="behind-info">
                                            {branch.commits_behind > 0 ? (
                                                <span className="behind-badge">
                                                    -{branch.commits_behind}
                                                </span>
                                            ) : (
                                                <span className="up-to-date">✅</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="table-cell actions-cell">
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => handleCheckout(branch)}
                                                disabled={loading || branch.is_current}
                                                className="table-rb-action-button checkout-button"
                                                title="Checkout Branch"
                                            >
                                                {!screenSize.isMobile && 'Checkout'}
                                            </button>

                                            <button
                                                onClick={() => handleCompare(branch)}
                                                disabled={loading}
                                                className="table-rb-action-button compare-button"
                                                title="Compare with Master"
                                            >
                                                {!screenSize.isMobile && 'Compare'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ================================
                🔍 COMPARISON MODAL
                ================================ */}
            {showComparison && comparison && selectedBranch && (
                <div className="rb-comparison-modal-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) setShowComparison(false);
                }}>
                    <div className="comparison-modal">
                        <div className="rb-modal-header">
                            <div className="rb-modal-title">
                                <span className="modal-icon">📊</span>
                                <h3>Branch Comparison</h3>
                            </div>
                            <button
                                onClick={() => setShowComparison(false)}
                                className="modal-close"
                                aria-label="Close comparison modal"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="rb-modal-content">
                            <div className="comparison-header">
                                <div className="comparison-info">
                                    <span className="comparing">Comparing:</span>
                                    <span className="branch-name">{comparison.branch_name}</span>
                                    <span className="vs">vs</span>
                                    <span className="base-branch">{comparison.base_branch}</span>
                                    <span className="repo-name">({comparison.repository})</span>
                                </div>
                            </div>

                            <div className="comparison-stats">
                                <div className="rb-stat-item">
                                    <span className="rb-stat-value">{comparison.total_files}</span>
                                    <span className="rb-stat-label">Files Changed</span>
                                </div>
                                <div className="rb-stat-item additions">
                                    <span className="rb-stat-value">+{comparison.total_additions}</span>
                                    <span className="rb-stat-label">Additions</span>
                                </div>
                                <div className="rb-stat-item deletions">
                                    <span className="rb-stat-value">-{comparison.total_deletions}</span>
                                    <span className="rb-stat-label">Deletions</span>
                                </div>
                            </div>

                            <div className="files-list">
                                <h4>Changed Files:</h4>
                                <div className="files-container">
                                    {comparison.files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="file-item clickable-file"
                                            onClick={() => handleFileClick(file)}
                                            title="Click to view file changes"
                                        >
                                            <div className="file-path">
                                                <span className={`change-type ${getChangeTypeColor(file.change_type)}`}>
                                                    {file.change_type.toUpperCase()}
                                                </span>
                                                <span className="path">{file.path}</span>
                                                <span className="file-click-hint">👁️ View</span>
                                            </div>
                                            <div className="file-stats">
                                                {file.additions > 0 && (
                                                    <span className="additions">+{file.additions}</span>
                                                )}
                                                {file.deletions > 0 && (
                                                    <span className="deletions">-{file.deletions}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================
                📄 FILE DIFF VIEWER
                ================================ */}
            {showFileDiff && fileDiff && selectedFile && (
                <FileDiffViewer
                    fileDiff={fileDiff}
                    selectedFile={selectedFile}
                    selectedBranch={selectedBranch}
                    onClose={() => setShowFileDiff(false)}
                    screenSize={screenSize}
                />
            )}

            {/* ================================
                ⏳ LOADING OVERLAY FOR FILE DIFF
                ================================ */}
            {loadingFileDiff && (
                <div className="rb-loading-overlay">
                    <div className="rb-loading-spinner">
                        <span className="spinner"></span>
                        <span>Loading file diff...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

// ================================
// 📄 COMPONENTE FILE DIFF VIEWER
// ================================
interface FileDiffViewerProps {
    fileDiff: FileDiff;
    selectedFile: ComparisonFile;
    selectedBranch: BranchInfo | null;
    onClose: () => void;
    screenSize: ScreenSize;
}

const FileDiffViewer: React.FC<FileDiffViewerProps> = React.memo(({
    fileDiff,
    selectedFile,
    selectedBranch,
    onClose,
    screenSize
}) => {
    const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('side-by-side');
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const unifiedViewRef = useRef<HTMLDivElement>(null);

    // Determinar si es solo agregado (sin comparación)
    const isAddedOnly = selectedFile.change_type === 'added';
    const isDeletedOnly = selectedFile.change_type === 'deleted';
    const hasComparison = !isAddedOnly && !isDeletedOnly;

    // Función para sincronizar scroll horizontal
    const isScrollingLeft = useRef(false);
    const isScrollingRight = useRef(false);

    // Función mejorada para manejar scroll con throttling
    const handleScrollSync = useCallback((source: 'left' | 'right', element: HTMLDivElement) => {
        if (viewMode !== 'side-by-side') return;

        // Evitar loops infinitos
        if (source === 'left' && isScrollingLeft.current) return;
        if (source === 'right' && isScrollingRight.current) return;

        const { scrollLeft, scrollTop } = element;

        if (source === 'left' && rightPanelRef.current) {
            isScrollingRight.current = true;
            rightPanelRef.current.scrollLeft = scrollLeft;
            rightPanelRef.current.scrollTop = scrollTop;

            // Reset flag después de un frame
            requestAnimationFrame(() => {
                isScrollingRight.current = false;
            });
        } else if (source === 'right' && leftPanelRef.current) {
            isScrollingLeft.current = true;
            leftPanelRef.current.scrollLeft = scrollLeft;
            leftPanelRef.current.scrollTop = scrollTop;

            // Reset flag después de un frame
            requestAnimationFrame(() => {
                isScrollingLeft.current = false;
            });
        }
    }, [viewMode]);

    const getChangeTypeColor = useCallback((type: string): string => {
        switch (type) {
            case 'added': return 'text-green';
            case 'deleted': return 'text-red';
            case 'modified': return 'text-yellow';
            case 'renamed': return 'text-blue';
            default: return 'text-gray';
        }
    }, []);

    const renderUnifiedView = useCallback(() => {
        if (!fileDiff.diff_lines || fileDiff.diff_lines.length === 0) {
            return (
                <div className="diff-rb-empty-state">
                    <div className="rb-empty-icon">📄</div>
                    <h3>No differences found</h3>
                    <p>This file appears to be identical or binary.</p>
                </div>
            );
        }

        return (
            <div className="diff-viewer unified" ref={unifiedViewRef}>
                <div className="diff-content-wrapper">
                    {fileDiff.diff_lines.map((line, index) => (
                        <div
                            key={index}
                            className={`diff-line diff-line-${line.type}`}
                        >
                            <div className="line-numbers">
                                <span className="line-number-old">
                                    {line.line_number_old || ''}
                                </span>
                                <span className="line-number-new">
                                    {line.line_number_new || ''}
                                </span>
                            </div>
                            <div className="line-content">
                                <span className="line-prefix">
                                    {line.type === 'added' ? '+' :
                                        line.type === 'deleted' ? '-' :
                                            line.type === 'header' ? '@' : ' '}
                                </span>
                                <span className="line-text">{line.content}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }, [fileDiff]);

    const renderSideBySideView = useCallback(() => {
        if (!hasComparison) {
            return renderUnifiedView();
        }

        // Separar líneas por tipo para vista lado a lado
        const oldLines: DiffLine[] = [];
        const newLines: DiffLine[] = [];

        fileDiff.diff_lines.forEach(line => {
            if (line.type === 'deleted' || line.type === 'context') {
                oldLines.push(line);
            }
            if (line.type === 'added' || line.type === 'context') {
                newLines.push(line);
            }
            if (line.type === 'header') {
                oldLines.push(line);
                newLines.push(line);
            }
        });

        const maxLines = Math.max(oldLines.length, newLines.length);

        return (
            <div className="diff-viewer side-by-side">
                {/* Panel Izquierdo - Archivo Original */}
                <div className="diff-panel">
                    <div className="diff-panel-header old">
                        <span className="header-label">Original (master)</span>
                        <span className="rb-header-info">-{selectedFile.deletions} deletions</span>
                    </div>
                    <div
                        className="diff-panel-content"
                        ref={leftPanelRef}
                        onScroll={(e) => handleScrollSync('left', e.currentTarget)}
                    >
                        <div className="diff-content-wrapper">
                            {Array.from({ length: maxLines }, (_, index) => {
                                const line = oldLines[index];
                                if (!line) {
                                    return (
                                        <div key={`old-${index}`} className="diff-line diff-line-empty">
                                            <div className="line-numbers">
                                                <span className="line-number-old"></span>
                                            </div>
                                            <div className="line-content">
                                                <span className="line-text"></span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={`old-${index}`}
                                        className={`diff-line diff-line-${line.type === 'added' ? 'context' : line.type}`}
                                    >
                                        <div className="line-numbers">
                                            <span className="line-number-old">
                                                {line.line_number_old || ''}
                                            </span>
                                        </div>
                                        <div className="line-content">
                                            <span className="line-prefix">
                                                {line.type === 'deleted' ? '-' :
                                                    line.type === 'header' ? '@' : ' '}
                                            </span>
                                            <span className="line-text">{line.content}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho - Archivo Nuevo */}
                <div className="diff-panel">
                    <div className="diff-panel-header new">
                        <span className="header-label">Modified ({selectedBranch?.display_name})</span>
                        <span className="rb-header-info">+{selectedFile.additions} additions</span>
                    </div>
                    <div
                        className="diff-panel-content"
                        ref={rightPanelRef}
                        onScroll={(e) => handleScrollSync('right', e.currentTarget)}
                    >
                        <div className="diff-content-wrapper">
                            {Array.from({ length: maxLines }, (_, index) => {
                                const line = newLines[index];
                                if (!line) {
                                    return (
                                        <div key={`new-${index}`} className="diff-line diff-line-empty">
                                            <div className="line-numbers">
                                                <span className="line-number-new"></span>
                                            </div>
                                            <div className="line-content">
                                                <span className="line-text"></span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={`new-${index}`}
                                        className={`diff-line diff-line-${line.type === 'deleted' ? 'context' : line.type}`}
                                    >
                                        <div className="line-numbers">
                                            <span className="line-number-new">
                                                {line.line_number_new || ''}
                                            </span>
                                        </div>
                                        <div className="line-content">
                                            <span className="line-prefix">
                                                {line.type === 'added' ? '+' :
                                                    line.type === 'header' ? '@' : ' '}
                                            </span>
                                            <span className="line-text">{line.content}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [fileDiff, hasComparison, selectedFile, selectedBranch, handleScrollSync]);

    return (
        <div className="rb-file-diff-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="file-diff-modal">
                {/* Header Mejorado */}
                <div className="file-diff-header">
                    <div className="file-diff-header-top">
                        <div className="file-diff-title">
                            <span className="file-diff-icon">📄</span>
                            <div className="file-diff-info">
                                <h3 title={selectedFile.path}>{selectedFile.path}</h3>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="file-diff-close"
                            title="Close diff viewer"
                            aria-label="Close file diff viewer"
                        />
                    </div>

                    <div className="file-diff-header-center">
                        <span className={`change-type-badge ${getChangeTypeColor(selectedFile.change_type)}`}>
                            {selectedFile.change_type.toUpperCase()}
                        </span>
                        <div className="file-diff-stats">
                            {selectedFile.additions > 0 && (
                                <span className="additions">+{selectedFile.additions} additions</span>
                            )}
                            {selectedFile.deletions > 0 && (
                                <span className="deletions">-{selectedFile.deletions} deletions</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mode Toggle - Solo mostrar para archivos con comparación y no en mobile */}
                {hasComparison && !screenSize.isMobile && (
                    <div className="diff-mode-toggle">
                        <div>
                            <button
                                className={`mode-button ${viewMode === 'unified' ? 'active' : ''}`}
                                onClick={() => setViewMode('unified')}
                            >
                                📋 Unified
                            </button>
                            <button
                                className={`mode-button ${viewMode === 'side-by-side' ? 'active' : ''}`}
                                onClick={() => setViewMode('side-by-side')}
                            >
                                ⚖️ Side by Side
                            </button>
                        </div>
                        {!screenSize.isTablet && (
                            <div className="mode-info">
                                <span className="scroll-hint">💡 Scroll is synchronized between panels</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="file-diff-content">
                    {viewMode === 'unified' || !hasComparison || screenSize.isMobile ?
                        renderUnifiedView() :
                        renderSideBySideView()
                    }
                </div>
            </div>
        </div>
    );
});

FileDiffViewer.displayName = 'FileDiffViewer';

export default ReviewBranches;
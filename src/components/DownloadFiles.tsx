import { useState } from 'react';
import './DownloadFiles.css';

interface DownloadFilesProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface FormData {
    server: string;
    kapId: string;
    waveId: string;
    token: string;
    allowTokenEdit: boolean;
}

const DownloadFiles: React.FC<DownloadFilesProps> = ({ isOpen, onClose, workspacePath }) => {
    const [loading, setLoading] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [downloadComplete, setDownloadComplete] = useState(false);
    const [downloadResult, setDownloadResult] = useState<any>(null);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [formData, setFormData] = useState<FormData>({
        server: 'Sandbox3',
        kapId: '',
        waveId: '',
        token: 'tW9GnMVNZwhm99yE0tE7ZOyJHmUfRgEAkJksgAjArB3BGNu0immVwEhjD1uBSYsL',
        allowTokenEdit: false
    });

    const servers = [
        'ProdBlue',
        'Prod',
        'Uat',
        'Dev',
        'Sandbox3',
        'Sandbox4',
        'Sandbox5',
        'Sandbox6',
        'Sandbox7',
        'Sandbox8',
        'Sandbox9',
        'Sandbox10',
        'Sandbox11',
        'Sandbox12',
        'Sandbox13',
        'Staging'
    ];

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateFields = () => {
        const errors: { [key: string]: string } = {};

        if (!formData.kapId.trim()) {
            errors.kapId = 'KapID is required';
        }

        if (!formData.waveId.trim()) {
            errors.waveId = 'Wave ID is required';
        }

        if (!formData.token.trim()) {
            errors.token = 'Authentication token is required';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleDownload = async () => {

        if (!validateFields()) {
            return;
        }

        setLoading(true);
        setShowProgress(true);
        setDownloadComplete(false);
        setProgress(0);
        setCurrentStep('🔄 Initializing Azure connection...');

        try {

            await simulateRealProgress();


            const response = await fetch('http://127.0.0.1:8000/azure/download-files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project_folder: formData.kapId,
                    wave_id: formData.waveId,
                    server: formData.server,
                    workspace_path: workspacePath
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setProgress(100);
                setCurrentStep('✅ Download completed successfully!');
                setDownloadResult(result);
                setDownloadComplete(true);
                setLoading(false);

            } else {
                throw new Error(result.message || 'Download failed');
            }
        } catch (error: any) {
            setCurrentStep(`❌ Download failed: ${error.message}`);
            setDownloadComplete(true);
            setLoading(false);
            console.error('Error downloading files:', error);
        }
    };

    const simulateRealProgress = async () => {
        const steps = [
            { progress: 15, step: '🔐 Authenticating with Azure servers...' },
            { progress: 30, step: '📡 Connecting to ' + formData.server + ' environment...' },
            { progress: 45, step: '🔍 Locating project files for ' + formData.kapId + '...' },
            { progress: 60, step: '📥 Downloading metadata files...' },
            { progress: 75, step: '📦 Downloading BEE analysis files...' },
            { progress: 90, step: '🔗 Downloading Files...' },
        ];

        for (const { progress: prog, step } of steps) {
            setProgress(prog);
            setCurrentStep(step);
            await new Promise(resolve => setTimeout(resolve, 600));
        }
    };

    const handleCloseModal = () => {

        setShowProgress(false);
        setDownloadComplete(false);
        setProgress(0);
        setCurrentStep('');
        setDownloadResult(null);
        setLoading(false);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="download-df-modal-backdrop"
            onClick={handleBackdropClick}
        >
            <div className="download-modal">

                <div className="download-df-modal-header">
                    <div className="df-header-content">
                        <div className="df-header-icon">

                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12 2L13.09 8.26L19 7L18.74 13.09L21 14L15.25 16.17L13.09 22L12 15.74L10.91 22L8.75 16.17L3 14L5.26 13.09L5 7L10.91 8.26L12 2Z"
                                    fill="url(#azure-gradient)"
                                    stroke="url(#azure-stroke)"
                                    strokeWidth="1"
                                />
                                <defs>
                                    <linearGradient id="azure-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6c5ce7" />
                                        <stop offset="100%" stopColor="#ff6b9d" />
                                    </linearGradient>
                                    <linearGradient id="azure-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#a29bfe" />
                                        <stop offset="100%" stopColor="#fd79a8" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="df-header-text">
                            <h2>Azure File Download</h2>
                            <p>Download BEE, CeV and Link files</p>
                        </div>
                    </div>
                    <button className="df-close-button" onClick={onClose}>

                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M18 6L6 18M6 6L18 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>


                {showProgress && (
                    <div className="df-progress-overlay">
                        <div className="progress-modal">
                            <div className="progress-header">
                                <div className="progress-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <div className="df-progress-title">
                                    <h3>Downloading Azure Files</h3>
                                    <p>Project: {formData.kapId} • Server: {formData.server}</p>
                                </div>
                            </div>

                            <div className="progress-content">

                                <div className="progress-bar-container">
                                    <div className="progress-bar-track">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="progress-percentage">{progress}%</div>
                                </div>


                                <div className="progress-step">
                                    {currentStep}
                                </div>


                                {downloadComplete && downloadResult?.success && (
                                    <div className="df-success-message">
                                        <div className="df-success-icon">✅</div>
                                        <div className="df-success-text">
                                            <h4>Download Completed Successfully!</h4>
                                            <p>Files have been downloaded to your workspace. You can find them at:</p>
                                            <code>{workspacePath}/{formData.kapId}</code>
                                            <p className="df-success-details">
                                                {downloadResult.total_files} files downloaded •
                                                Check your workspace folder to access the files
                                            </p>
                                        </div>
                                    </div>
                                )}


                                {downloadComplete && !downloadResult?.success && (
                                    <div className="df-error-message">
                                        <div className="df-error-icon">❌</div>
                                        <div className="df-error-text">
                                            <h4>Download Failed</h4>
                                            <p>Please check your parameters and try again.</p>
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="progress-actions">
                                {downloadComplete ? (
                                    <button
                                        className="df-modal-button df-primary"
                                        onClick={handleCloseModal}
                                    >
                                        Close
                                    </button>
                                ) : (
                                    <button
                                        className="df-modal-button df-secondary"
                                        onClick={handleCloseModal}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                <div className={`download-modal-content ${showProgress ? 'content-hidden' : ''}`}>

                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">

                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="3" width="20" height="4" rx="1" fill="currentColor" opacity="0.8" />
                                    <rect x="2" y="10" width="20" height="4" rx="1" fill="currentColor" opacity="0.6" />
                                    <rect x="2" y="17" width="20" height="4" rx="1" fill="currentColor" opacity="0.4" />
                                    <circle cx="6" cy="5" r="1" fill="#1a1d3a" />
                                    <circle cx="6" cy="12" r="1" fill="#1a1d3a" />
                                    <circle cx="6" cy="19" r="1" fill="#1a1d3a" />
                                </svg>
                            </span>
                            Server Environment
                        </label>
                        <select
                            value={formData.server}
                            onChange={(e) => handleInputChange('server', e.target.value)}
                            className="cyber-select"
                        >
                            {servers.map(server => (
                                <option key={server} value={server}>{server}</option>
                            ))}
                        </select>
                        {validationErrors.server && (
                            <span className="df-error-text-validation">{validationErrors.server}</span>
                        )}
                    </div>


                    <div className={`form-group ${validationErrors.kapId ? 'error' : ''}`}>
                        <label className="form-label">
                            <span className="label-icon">

                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M7 10h4M7 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="15" cy="12" r="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                            </span>
                            KapID
                        </label>
                        <input
                            type="text"
                            value={formData.kapId}
                            onChange={(e) => handleInputChange('kapId', e.target.value.toUpperCase())}
                            placeholder="Enter project KapID..."
                            className="cyber-input"
                            autoComplete="off"
                        />
                        {validationErrors.kapId && (
                            <span className="df-error-text-validation">{validationErrors.kapId}</span>
                        )}
                    </div>


                    <div className={`form-group ${validationErrors.waveId ? 'error' : ''}`}>
                        <label className="form-label">
                            <span className="label-icon">

                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M2 12c0-2 1-3 2-3s2 1 2 3-1 3-2 3-2-1-2-3zm6 0c0-2 1-3 2-3s2 1 2 3-1 3-2 3-2-1-2-3zm6 0c0-2 1-3 2-3s2 1 2 3-1 3-2 3-2-1-2-3z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                            Wave ID
                        </label>
                        <input
                            type="text"
                            value={formData.waveId}
                            onChange={(e) => handleInputChange('waveId', e.target.value)}
                            placeholder="Enter wave identifier..."
                            className="cyber-input"
                            autoComplete="off"
                        />
                        {validationErrors.waveId && (
                            <span className="df-error-text-validation">{validationErrors.waveId}</span>
                        )}
                    </div>


                    <div className={`form-group ${validationErrors.token ? 'error' : ''}`}>
                        <label className="form-label">
                            <span className="label-icon">

                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </span>
                            Authentication Token
                        </label>
                        <input
                            type="password"
                            value={formData.token}
                            onChange={(e) => handleInputChange('token', e.target.value)}
                            placeholder="Enter authentication token..."
                            className="cyber-input"
                            disabled={!formData.allowTokenEdit}
                            autoComplete="new-password"
                        />
                        <div className="token-checkbox">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.allowTokenEdit}
                                    onChange={(e) => handleInputChange('allowTokenEdit', e.target.checked)}
                                    className="cyber-checkbox"
                                />
                                <span className="checkbox-text">Update Token</span>
                            </label>
                        </div>
                        {validationErrors.token && (
                            <span className="df-error-text-validation">{validationErrors.token}</span>
                        )}
                    </div>


                    <div className="workspace-info">
                        <div className="info-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="none"
                                />
                            </svg>
                        </div>
                        <div className="info-text">
                            <span className="df-info-label">Download Location:</span>
                            <span className="info-path">{workspacePath}</span>
                        </div>
                    </div>
                </div>


                <div className="download-modal-actions">
                    <button
                        className="df-modal-button df-secondary"
                        onClick={handleCloseModal}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="df-modal-button df-primary"
                        onClick={handleDownload}
                        disabled={loading || !formData.kapId.trim() || !formData.waveId.trim() || !formData.token.trim()}
                    >
                        {loading ? (
                            <>
                                <div className="df-loading-spinner"></div>
                                Downloading...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                Download Files
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadFiles;
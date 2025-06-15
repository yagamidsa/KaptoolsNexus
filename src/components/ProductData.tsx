// src/components/ProductData.tsx - VERSIÓN COMPLETA CON MANEJO MEJORADO DE ERRORES
import { useState } from 'react';
import './ProductData.css';

interface ProductDataProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface ProductInfo {
    kapid: string;
    server: string;
    creator: string;
    product_type: string;
    version: string;
    platform: string;
    status: string;
    wave_id: string;
    language: string;
    creation_date: string;
    raw_data?: any;
}

interface ErrorDetails {
    code?: string;
    description?: string;
    source?: string;
    kapid?: string;
    server?: string;
}

interface ApiResponse {
    success: boolean;
    message: string;
    error_type?: string;
    error_details?: ErrorDetails;
    suggestion?: string;
    raw_error?: string;
    data?: ProductInfo;
}

const ProductData: React.FC<ProductDataProps> = ({ isOpen, onClose, workspacePath }) => {
    const [loading, setLoading] = useState(false);
    const [selectedServer, setSelectedServer] = useState('Sandbox3');
    const [kapId, setKapId] = useState('');
    const [token, setToken] = useState('tW9GnMVNZwhm99yE0tE7ZOyJHmUfRgEAkJksgAjArB3BGNu0immVwEhjD1uBSYsL');
    const [updateToken, setUpdateToken] = useState(false);
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
    const [error, setError] = useState('');
    const [errorDetails, setErrorDetails] = useState<ApiResponse | null>(null);
    const [availableServers, setAvailableServers] = useState<string[]>([
        'Sandbox3', 'Sandbox4', 'Sandbox5', 'Sandbox6', 'Sandbox7', 'Sandbox8',
        'Sandbox9', 'Sandbox10', 'Sandbox11', 'Sandbox12', 'Sandbox13', 'Staging'
    ]);

    // 🔥 Función para validar KapID
    const validateKapId = async (kapIdValue: string): Promise<boolean> => {
        if (!kapIdValue.trim()) return false;

        try {
            const response = await fetch('http://127.0.0.1:8000/product/validate-kapid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kapid: kapIdValue
                }),
            });

            const data = await response.json();
            return data.valid;
        } catch (error) {
            console.error('KapID validation error:', error);
            return kapIdValue.trim().length >= 3; // Fallback validation
        }
    };

    // 🔥 Función mejorada para buscar datos del producto
    const handleSearch = async () => {
        const trimmedKapId = kapId.trim();

        if (!trimmedKapId) {
            setError('❌ KapID is required');
            setErrorDetails(null);
            return;
        }

        if (!selectedServer) {
            setError('❌ Please select a server');
            setErrorDetails(null);
            return;
        }

        if (!token.trim()) {
            setError('❌ Authentication token is required');
            setErrorDetails(null);
            return;
        }

        // Validar KapID antes de continuar
        const isValidKapId = await validateKapId(trimmedKapId);
        if (!isValidKapId) {
            setError('❌ Invalid KapID format');
            setErrorDetails(null);
            return;
        }

        setLoading(true);
        setError('');
        setErrorDetails(null);
        setProductInfo(null);

        try {
            const response = await fetch('http://127.0.0.1:8000/product/get-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kapid: trimmedKapId,
                    server: selectedServer,
                    token: token.trim()
                }),
            });

            if (response.ok) {
                const data: ApiResponse = await response.json();

                if (data.success && data.data) {
                    setProductInfo(data.data);
                    setError('');
                    setErrorDetails(null);
                } else {
                    setError(data.message || '❌ Failed to fetch product data');
                    setErrorDetails(data);
                }
            } else {
                const errorData = await response.json();
                setError(`❌ ${errorData.detail || 'Server error'}`);
                setErrorDetails(errorData);
            }

        } catch (err) {
            console.error('Search error:', err);
            setError('❌ Connection failed - Make sure backend is running');
            setErrorDetails({
                success: false,
                message: 'Connection failed',
                error_type: 'connection_error',
                suggestion: '• Start the backend server\n• Check network connectivity\n• Verify firewall settings'
            });
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Función para limpiar resultados
    const clearResults = () => {
        setProductInfo(null);
        setError('');
        setErrorDetails(null);
        setKapId('');
    };

    // 🔥 Función para cambiar servidor automáticamente
    const tryDifferentServer = () => {
        const currentIndex = availableServers.indexOf(selectedServer);
        const nextIndex = (currentIndex + 1) % availableServers.length;
        const nextServer = availableServers[nextIndex];
        
        setSelectedServer(nextServer);
        setError(`🔄 Switched to ${nextServer} - Try search again`);
        setErrorDetails(null);
    };

    // 🔥 Función para formatear fecha
    const formatDate = (dateString: string): string => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            });
        } catch {
            return dateString;
        }
    };

    // 🔥 Función para determinar color del status
    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'live':
            case 'running':
                return 'status-active';
            case 'completed':
            case 'finished':
                return 'status-completed';
            case 'draft':
            case 'pending':
                return 'status-pending';
            case 'paused':
            case 'suspended':
                return 'status-paused';
            default:
                return 'status-default';
        }
    };

    // 🔥 Handle Enter key press
    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && !loading && kapId.trim()) {
            handleSearch();
        }
    };

    // 🔥 Renderizar panel de error mejorado
    const renderErrorPanel = () => {
        if (!error && !errorDetails) return null;

        return (
            <div className="error-panel-enhanced">
                <div className="error-header">
                    <svg viewBox="0 0 24 24" className="error-icon">
                        <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                    <h4>Error Details</h4>
                </div>

                <div className="error-content">
                    <div className="error-message">
                        {error}
                    </div>

                    {/* 🔥 Mostrar detalles específicos del error KAP */}
                    {errorDetails?.error_details && (
                        <div className="kap-error-details">
                            <h5>🔥 KAP Server Error Information:</h5>
                            <div className="error-grid">
                                <div className="error-item">
                                    <label>Error Code:</label>
                                    <span className="error-code">{errorDetails.error_details.code}</span>
                                </div>
                                <div className="error-item">
                                    <label>Description:</label>
                                    <span>{errorDetails.error_details.description}</span>
                                </div>
                                <div className="error-item">
                                    <label>Source:</label>
                                    <span>{errorDetails.error_details.source}</span>
                                </div>
                                <div className="error-item">
                                    <label>KapID:</label>
                                    <span>{errorDetails.error_details.kapid}</span>
                                </div>
                                <div className="error-item">
                                    <label>Server:</label>
                                    <span>{errorDetails.error_details.server}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🔥 Mostrar sugerencias de solución */}
                    {errorDetails?.suggestion && (
                        <div className="error-suggestions">
                            <h5>💡 Suggested Solutions:</h5>
                            <div className="suggestions-text">
                                {errorDetails.suggestion.split('\n').map((line, index) => (
                                    <div key={index} className="suggestion-line">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 🔥 Acciones rápidas para errores específicos */}
                    {errorDetails?.error_type === 'server_error' && (
                        <div className="error-actions">
                            <h5>🛠️ Quick Actions:</h5>
                            <div className="action-buttons">
                                <button 
                                    className="pd-action-button pd-secondary"
                                    onClick={tryDifferentServer}
                                    disabled={loading}
                                >
                                    🔄 Try Different Server
                                </button>
                                <button 
                                    className="pd-action-button pd-secondary"
                                    onClick={() => window.open(`https://${selectedServer.toLowerCase()}-kap-ui.azurewebsites.net/#/projects/dashboard`, '_blank')}
                                >
                                    🌐 Open KAP Portal
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 🔥 Raw error para debugging */}
                    {errorDetails?.raw_error && (
                        <details className="raw-error-details">
                            <summary>🔧 Raw Error (for debugging)</summary>
                            <pre className="raw-error-text">{errorDetails.raw_error}</pre>
                        </details>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="product-data-overlay">
            <div className="product-data-modal">
                {/* Header */}
                <div className="product-data-header">
                    <div className="pd-header-content">
                        <div className="pd-header-icon">
                            <svg viewBox="0 0 24 24" className="icon-svg">
                                <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                        </div>
                        <div className="pd-header-text">
                            <h2>Product Data Inspector</h2>
                            <p>Quantum product analysis & metadata extraction</p>
                        </div>
                    </div>
                    <button className="pd-close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" className="icon-svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="product-data-content">
                    {/* Configuration Panel */}
                    <div className="config-panel">
                        <div className="panel-section">
                            <h3>
                                <svg viewBox="0 0 24 24" className="section-icon">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Environment Configuration
                            </h3>

                            <div className="pd-input-group">
                                <label>
                                    <svg viewBox="0 0 24 24" className="pd-label-icon">
                                        <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                    Target Server
                                </label>
                                <select
                                    value={selectedServer}
                                    onChange={(e) => setSelectedServer(e.target.value)}
                                    className="pd-cyber-select"
                                    disabled={loading}
                                >
                                    {availableServers.map(server => (
                                        <option key={server} value={server}>{server}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pd-input-group">
                                <label>
                                    <svg viewBox="0 0 24 24" className="pd-label-icon">
                                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                    Product KapID
                                </label>
                                <input
                                    type="text"
                                    value={kapId}
                                    onChange={(e) => setKapId(e.target.value.toUpperCase())}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter KapID (e.g. KAP12345)"
                                    className="pd-cyber-input"
                                    disabled={loading}
                                    maxLength={20}
                                />
                            </div>

                            <div className="pd-input-group">
                                <label>
                                    <svg viewBox="0 0 24 24" className="pd-label-icon">
                                        <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                    Access Token
                                </label>
                                <div className="token-container">
                                    <input
                                        type={updateToken ? "text" : "password"}
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        disabled={!updateToken || loading}
                                        className={`cyber-input ${!updateToken ? 'disabled' : ''}`}
                                        placeholder="Authentication token..."
                                    />
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={updateToken}
                                            onChange={(e) => setUpdateToken(e.target.checked)}
                                            disabled={loading}
                                        />
                                        <span className="checkmark">
                                            <svg viewBox="0 0 24 24" className="pd-check-icon">
                                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        Update Token
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="action-panel">
                        <button
                            className="pd-action-button pd-primary"
                            onClick={handleSearch}
                            disabled={loading || !kapId.trim() || !token.trim()}
                        >
                            {loading ? (
                                <>
                                    <div className="pd-loading-spinner"></div>
                                    Scanning Quantum Database...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" className="button-icon">
                                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Analyze Product Data
                                </>
                            )}
                        </button>

                        {(productInfo || error) && (
                            <button
                                className="pd-action-button pd-secondary"
                                onClick={clearResults}
                                disabled={loading}
                            >
                                <svg viewBox="0 0 24 24" className="button-icon">
                                    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Clear Results
                            </button>
                        )}
                    </div>

                    {/* 🔥 Panel de error mejorado */}
                    {renderErrorPanel()}

                    {/* Results Panel */}
                    {productInfo && (
                        <div className="results-panel">
                            <h3>
                                <svg viewBox="0 0 24 24" className="section-icon">
                                    <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                                Product Analysis Results
                            </h3>

                            <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        Status
                                    </label>
                                    <div className={`result-value ${getStatusColor(productInfo.status)}`}>
                                        {productInfo.status || 'N/A'}
                                    </div>
                                </div> 


                            <div className="results-grid">
                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        KapID
                                    </label>
                                    <div className="pd-result-value">{productInfo.kapid}</div>
                                </div>

                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        Creator
                                    </label>
                                    <div className="pd-result-value">{productInfo.creator || 'N/A'}</div>
                                </div>


                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Version
                                    </label>
                                    <div className="pd-result-value">{productInfo.version || 'N/A'}</div>
                                </div>

                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Product Type
                                    </label>
                                    <div className="pd-result-value">{productInfo.product_type || 'N/A'}</div>
                                </div>

                                

                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        Platform
                                    </label>
                                    <div className="pd-result-value">{productInfo.platform || 'N/A'}</div>
                                </div>

                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Wave ID
                                    </label>
                                    <div className="pd-result-value">{productInfo.wave_id || 'N/A'}</div>
                                </div>

                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        Language
                                    </label>
                                    <div className="pd-result-value">{productInfo.language || 'N/A'}</div>
                                </div>

                                <div className="pd-result-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        Creation Date
                                    </label>
                                    <div className="pd-result-value">{formatDate(productInfo.creation_date)}</div>
                                </div>


                                {/* 🔥 Server item centrado */}
                                <div className="pd-result-item server-item">
                                    <label>
                                        <svg viewBox="0 0 24 24" className="result-icon">
                                            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M9.5 17C7.01 17 5 14.99 5 12.5S7.01 8 9.5 8 14 10.01 14 12.5 11.99 17 9.5 17z" stroke="currentColor" strokeWidth="2" fill="none" />
                                        </svg>
                                        
                                    </label>
                                    <div className="pd-result-value">{productInfo.server}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductData;
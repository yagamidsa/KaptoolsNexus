// src/components/ProductChunksProcessor.tsx
import React, { useState, useEffect } from 'react';
import './ProductChunksModal.css';

interface ProductChunksProcessorProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface ProcessingResult {
    success: boolean;
    message: string;
    report_content: string;
    product_name: string;
    total_chunks: number;
    chunks_by_type: {
        CATEGORICAL: number;
        TEXT: number;
        NUMERIC: number;
        GRID: number;
        UNKNOWN: number;
    };
    variables_found: number;
    new_chunks_created: number;
    existing_chunks_found: number;
}

interface ExclusionsData {
    success: boolean;
    message: string;
    exclusions: string[];
    total_exclusions: number;
}

const ProductChunksProcessor: React.FC<ProductChunksProcessorProps> = ({
    isOpen,
    onClose,
    workspacePath
}) => {
    const [token, setToken] = useState('tW9GnMVNZwhm99yE0tE7ZOyJHmUfRgEAkJksgAjArB3BGNu0immVwEhjD1uBSYsL');
    const [productName, setProductName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<ProcessingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showExclusions, setShowExclusions] = useState(false);
    const [exclusions, setExclusions] = useState<string[]>([]);
    const [exclusionsText, setExclusionsText] = useState('');
    const [loadingExclusions, setLoadingExclusions] = useState(false);
    

    useEffect(() => {
        if (isOpen && !exclusions.length) {
            loadExclusions();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const loadExclusions = async () => {
        setLoadingExclusions(true);
        try {
            const response = await fetch(`http://localhost:8000/product-chunks/exclusions?workspace_path=${encodeURIComponent(workspacePath)}`);
            if (response.ok) {
                const data: ExclusionsData = await response.json();
                setExclusions(data.exclusions);
                setExclusionsText(data.exclusions.join(', '));
            }
        } catch (err) {
            console.error('Error loading exclusions:', err);
        } finally {
            setLoadingExclusions(false);
        }
    };

    const updateExclusions = async (action: 'add' | 'remove' | 'replace') => {
        try {
            const formData = new FormData();
            formData.append('workspace_path', workspacePath);
            formData.append('exclusions_text', exclusionsText);
            formData.append('action', action);

            const response = await fetch('http://localhost:8000/product-chunks/exclusions/update', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data: ExclusionsData = await response.json();
                setExclusions(data.exclusions);
                setExclusionsText(data.exclusions.join(', '));
                setError(null);
                alert(`✅ ${data.total_exclusions} exclusions updated successfully!`);
            } else {
                throw new Error('Failed to update exclusions');
            }
        } catch (err) {
            setError('Failed to update exclusions: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };


    const handleSubmit = async () => {
        if (!token.trim() || !productName.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('token', token.trim());
            formData.append('product_name', productName.trim());
            formData.append('workspace_path', workspacePath);

            const response = await fetch('http://localhost:8000/product-chunks/process', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data: ProcessingResult = await response.json();
                setResult(data);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Processing failed');
            }

        } catch (err) {
            console.error('Processing error:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setToken('');
        setProductName('');
        setResult(null);
        setError(null);
        setShowExclusions(false);
    };

    const getTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            CATEGORICAL: 'type-label categorical',
            TEXT: 'type-label text',
            NUMERIC: 'type-label numeric',
            GRID: 'type-label grid',
            UNKNOWN: 'type-label unknown'
        };
        return colors[type] || 'type-label unknown';
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'CATEGORICAL': return '🔘';
            case 'TEXT': return '📝';
            case 'NUMERIC': return '🔢';
            case 'GRID': return '📊';
            default: return '❓';
        }
    };

    return (
        <div className="product-chunks-modal">
            <div className="product-chunks-modal-container">

                <div className="product-chunks-header">
                    <div className="product-chunks-header-content">
                        <div className="product-chunks-icon">
                            📊
                        </div>
                        <div>
                            <h2 className="product-chunks-title">Product Chunks Processor</h2>
                            <p className="product-chunks-subtitle">Download JSON and generate chunks report</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="close-button"
                    >
                        ✕
                    </button>
                </div>


                <div className="product-chunks-content">
                    {!result ? (

                        <div className="form-container">

                            <div className="exclusions-toggle">
                                <button
                                    onClick={() => setShowExclusions(!showExclusions)}
                                    className="exclusions-button"
                                    disabled={isProcessing}
                                >
                                    <span>{showExclusions ? '📋' : '⚙️'}</span>
                                    <span>{showExclusions ? 'Hide Exclusions' : 'Manage Exclusions'}</span>
                                    <span>({exclusions.length} items)</span>
                                </button>
                            </div>


                            {showExclusions && (
                                <div className="exclusions-panel">
                                    <h4 className="exclusions-title">
                                        <span>🚫</span>
                                        <span>Variables to Exclude</span>
                                    </h4>
                                    <p className="exclusions-description">
                                        Variables in this list will NOT be processed (dummy, test, control variables, etc.)
                                    </p>

                                    <div className="exclusions-textarea-container">
                                        <textarea
                                            value={exclusionsText}
                                            onChange={(e) => setExclusionsText(e.target.value)}
                                            className="exclusions-textarea"
                                            placeholder="Enter variable names separated by commas..."
                                            rows={8}
                                            disabled={loadingExclusions}
                                        />
                                        <div className="exclusions-count">
                                            {exclusionsText.split(',').filter(item => item.trim()).length} variables
                                        </div>
                                    </div>

                                    <div className="exclusions-actions">
                                        <button
                                            onClick={() => updateExclusions('replace')}
                                            className="exclusions-action-button primary"
                                            disabled={loadingExclusions}
                                        >
                                            <span>💾</span>
                                            <span>Save Changes</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <div className="input-group">
                                    <label className="input-label">
                                        Azure API Token
                                    </label>
                                    <input
                                        type="password"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="input-field"
                                        placeholder="Enter your Azure API token"
                                        disabled={isProcessing}
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">
                                        Product Name
                                    </label>
                                    <input
                                        type="text"
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                        className="input-field"
                                        placeholder="Enter product name (e.g., Linkplustv)"
                                        disabled={isProcessing}
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">
                                        Workspace Path
                                    </label>
                                    <input
                                        type="text"
                                        value={workspacePath}
                                        readOnly
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="error-message">
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isProcessing || !token.trim() || !productName.trim()}
                                className="primary-button"
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="animate-pulse">⏳</span>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📊</span>
                                        <span>Process Product Chunks</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (

                        <div className="results-container">

                            <div className="success-message">
                                <div>
                                    <h3 className="success-title">Processing Complete!</h3>
                                    <p className="success-description">{result.message}</p>
                                </div>
                            </div>


                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h4 className="stat-label">Variables Found</h4>
                                    <p className="stat-value product">{result.variables_found || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h4 className="stat-label">New Chunks Created</h4>
                                    <p className="stat-value chunks">{result.new_chunks_created || 0}</p>
                                </div>
                                <div className="stat-card">
                                    <h4 className="stat-label">Existing Chunks</h4>
                                    <p className="stat-value existing">{result.existing_chunks_found || 0}</p>
                                </div>
                            </div>


                            <div className="chunks-breakdown">
                                <h4 className="breakdown-title">Chunks by Question Type</h4>
                                <div className="breakdown-list">
                                    {Object.entries(result.chunks_by_type).map(([type, count]) => (
                                        count > 0 && (
                                            <div key={type} className="breakdown-item">
                                                <div className="breakdown-item-left">
                                                    <span>{getTypeIcon(type)}</span>
                                                    <span className={getTypeColor(type)}>
                                                        {type}
                                                    </span>
                                                </div>
                                                <span className="breakdown-count">{count}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>


                            <div className="report-preview">
                                <h4 className="report-title">
                                    <span>📄</span>
                                    <span>Report Preview</span>
                                </h4>
                                <div className="report-content">
                                    <pre className="report-text">
                                        {result.report_content.split('\n').slice(0, 15).join('\n')}
                                        {result.report_content.split('\n').length > 15 && '\n...'}
                                    </pre>
                                </div>
                            </div>


                            <div className="action-buttons">
                                <button
                                    onClick={handleReset}
                                    className="action-button reset-button"
                                >
                                    <span>🔄</span>
                                    <span>Process Another</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductChunksProcessor;
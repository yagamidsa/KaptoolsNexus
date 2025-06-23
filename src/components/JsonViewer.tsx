import React from 'react';
import './JsonViewer.css';

interface JsonViewerProps {
    data: string;
    title?: string;
    onCopy?: (text: string) => void;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, title = "JSON Data", onCopy }) => {

    const renderJsonRecursive = (obj: any, indent: number = 0): JSX.Element[] => {
        const elements: JSX.Element[] = [];
        const indentStr = '  '.repeat(indent);

        if (obj === null) {
            elements.push(
                <span key="null" className="json-null">null</span>
            );
        } else if (typeof obj === 'string') {
            elements.push(
                <span key="string" className="json-string">"{obj}"</span>
            );
        } else if (typeof obj === 'number') {
            elements.push(
                <span key="number" className="json-number">{obj}</span>
            );
        } else if (typeof obj === 'boolean') {
            elements.push(
                <span key="boolean" className="json-boolean">{String(obj)}</span>
            );
        } else if (Array.isArray(obj)) {
            elements.push(
                <span key="array-start" className="json-punctuation">[</span>
            );

            if (obj.length > 0) {
                elements.push(<br key="array-br-start" />);

                obj.forEach((item, index) => {
                    elements.push(
                        <span key={`array-item-${index}`}>
                            <span className="json-indent">{indentStr}  </span>
                            {renderJsonRecursive(item, indent + 1)}
                            {index < obj.length - 1 && <span className="json-punctuation">,</span>}
                            <br />
                        </span>
                    );
                });

                elements.push(
                    <span key="array-end" className="json-indent">{indentStr}</span>
                );
            }

            elements.push(
                <span key="array-close" className="json-punctuation">]</span>
            );
        } else if (typeof obj === 'object') {
            const keys = Object.keys(obj);

            elements.push(
                <span key="object-start" className="json-punctuation">{'{'}</span>
            );

            if (keys.length > 0) {
                elements.push(<br key="object-br-start" />);

                keys.forEach((key, index) => {
                    elements.push(
                        <span key={`object-key-${key}`}>
                            <span className="json-indent">{indentStr}  </span>
                            <span className="json-key">"{key}"</span>
                            <span className="json-punctuation">: </span>
                            {renderJsonRecursive(obj[key], indent + 1)}
                            {index < keys.length - 1 && <span className="json-punctuation">,</span>}
                            <br />
                        </span>
                    );
                });

                elements.push(
                    <span key="object-end" className="json-indent">{indentStr}</span>
                );
            }

            elements.push(
                <span key="object-close" className="json-punctuation">{'}'}</span>
            );
        }

        return elements;
    };

    const renderJson = () => {
        if (!data || data.trim() === '') {
            return (
                <div className="json-empty">
                    <span className="json-placeholder">No JSON data to display...</span>
                </div>
            );
        }

        try {
            const parsed = JSON.parse(data);
            return (
                <div className="json-content">
                    {renderJsonRecursive(parsed)}
                </div>
            );
        } catch (error) {
            return (
                <div className="json-error">
                    <div className="json-error-title">⚠️ Invalid JSON Format</div>
                    <div className="json-error-message">Error: {String(error)}</div>
                    <div className="json-raw-content">
                        <strong>Raw Content:</strong>
                        <pre>{data}</pre>
                    </div>
                </div>
            );
        }
    };

    const copyToClipboard = () => {
        if (onCopy) {
            onCopy(data);
        }
    };

    return (
        <div className="json-viewer">
            <div className="json-header">
                <h4>{title}</h4>
                {data && onCopy && (
                    <button onClick={copyToClipboard} className="json-copy-btn">
                        📋 Copy
                    </button>
                )}
            </div>
            <div className="json-body">
                {renderJson()}
            </div>
        </div>
    );
};

export default JsonViewer;
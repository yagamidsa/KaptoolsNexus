import React, { useState } from 'react';
import './JSONPathTool.css';

// Componente de iconos
const Icon: React.FC<{ emoji: string; size?: number; className?: string }> = ({ 
    emoji, 
    size = 16, 
    className = "" 
}) => (
    <span className={className} style={{ fontSize: `${size}px`, lineHeight: 1 }}>
        {emoji}
    </span>
);

const JSONPathTool: React.FC = () => {
    const [environment, setEnvironment] = useState('sandbox3');
    const [selectedService, setSelectedService] = useState('study-definition');
    const [endpoint, setEndpoint] = useState('/studies/KAP810451268');
    const [token, setToken] = useState('');
    const [jsonPathQuery, setJsonPathQuery] = useState('$');
    const [showToken, setShowToken] = useState(false);
    const [apiResponse, setApiResponse] = useState('');
    const [jsonPathResult, setJsonPathResult] = useState('');
    const [message, setMessage] = useState('Ready to simulate API requests');

    // Datos de ejemplo para simular respuestas
    const sampleData = {
        "study_id": "KAP810451268",
        "name": "Consumer Insights Study 2024",
        "status": "active",
        "data": [
            {
                "id": 1,
                "participant": "User001",
                "responses": {
                    "q1": "Very satisfied",
                    "q2": 8,
                    "demographics": {
                        "age": 32,
                        "location": "New York"
                    }
                }
            },
            {
                "id": 2,
                "participant": "User002", 
                "responses": {
                    "q1": "Satisfied",
                    "q2": 7,
                    "demographics": {
                        "age": 28,
                        "location": "California"
                    }
                }
            }
        ],
        "metadata": {
            "total_participants": 2,
            "completion_rate": 0.95,
            "created_date": "2024-01-15"
        }
    };

    const environments = [
        { key: 'sandbox3', name: 'Sandbox 3' },
        { key: 'sandbox8', name: 'Sandbox 8' },
        { key: 'production', name: 'Production' }
    ];

    const services = {
        'study-definition': { name: 'Study Definition' },
        'questionnaire-factory': { name: 'Questionnaire Factory' },
        'product-template': { name: 'Product Template' }
    };

    const examples = [
        { name: 'Root Object', query: '$', description: 'Returns the entire JSON object' },
        { name: 'All Data', query: '$.data[*]', description: 'All items in data array' },
        { name: 'Participant Names', query: '$.data[*].participant', description: 'Extract all participant names' },
        { name: 'First Response', query: '$.data[0].responses', description: 'First participant responses' },
        { name: 'All Ages', query: '$.data[*].responses.demographics.age', description: 'All participant ages' },
        { name: 'Study Metadata', query: '$.metadata', description: 'Study metadata' }
    ];

    const simulateApiRequest = () => {
        if (!token.trim()) {
            setMessage('Please enter a dev token');
            return;
        }

        setMessage('Simulating API request...');
        
        // Simular delay de red
        setTimeout(() => {
            const responseJson = JSON.stringify(sampleData, null, 2);
            setApiResponse(responseJson);
            setMessage('✅ Sample data loaded! Now you can apply JSONPath queries.');
            
            // Aplicar JSONPath automáticamente
            applyJsonPath(responseJson);
        }, 1000);
    };

    const applyJsonPath = (jsonData?: string) => {
        const dataToUse = jsonData || apiResponse;
        
        if (!dataToUse) {
            setMessage('No API data available. Simulate a request first.');
            return;
        }

        if (!jsonPathQuery.trim()) {
            setMessage('Please enter a JSONPath query.');
            return;
        }

        try {
            setMessage('Applying JSONPath query...');
            
            // Implementación básica de JSONPath para demo
            const data = JSON.parse(dataToUse);
            let result;

            switch (jsonPathQuery) {
                case '$':
                    result = data;
                    break;
                case '$.data':
                    result = data.data;
                    break;
                case '$.data[*]':
                    result = data.data;
                    break;
                case '$.data[*].participant':
                    result = data.data?.map((item: any) => item.participant) || [];
                    break;
                case '$.data[0]':
                    result = data.data?.[0];
                    break;
                case '$.data[0].responses':
                    result = data.data?.[0]?.responses;
                    break;
                case '$.data[*].responses.demographics.age':
                    result = data.data?.map((item: any) => item.responses?.demographics?.age).filter((age: any) => age !== undefined) || [];
                    break;
                case '$.metadata':
                    result = data.metadata;
                    break;
                case '$.metadata.total_participants':
                    result = data.metadata?.total_participants;
                    break;
                default:
                    // Para queries más complejas, intentar evaluación básica
                    if (jsonPathQuery.startsWith('$.')) {
                        const path = jsonPathQuery.substring(2).split('.');
                        result = path.reduce((obj, key) => {
                            if (key.includes('[') && key.includes(']')) {
                                const arrayKey = key.substring(0, key.indexOf('['));
                                const index = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
                                if (index === '*') {
                                    return obj[arrayKey];
                                } else {
                                    return obj[arrayKey]?.[parseInt(index)];
                                }
                            }
                            return obj?.[key];
                        }, data);
                    } else {
                        result = "Unsupported JSONPath query in demo mode";
                    }
            }

            setJsonPathResult(JSON.stringify(result, null, 2));
            setMessage('✅ JSONPath applied successfully!');
        } catch (error) {
            setJsonPathResult(`JSONPath Error: ${error}`);
            setMessage(`JSONPath failed: ${error}`);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setMessage('Copied to clipboard!');
        setTimeout(() => setMessage('Ready to simulate API requests'), 2000);
    };

    const clear = () => {
        setApiResponse('');
        setJsonPathResult('');
        setMessage('Ready to simulate API requests');
    };

    const useExample = (example: any) => {
        setJsonPathQuery(example.query);
    };

    return (
        <div className="jsonpath-tool-container">
            {/* Header */}
            <div className="jsonpath-header">
                <div className="header-content">
                    <div className="header-left">
                        <div className="header-icon">
                            <Icon emoji="🔍" size={20} />
                        </div>
                        <div className="header-info">
                            <h1>KAP JSONPath API Tool (Demo)</h1>
                            <p>JSONPath querying with sample KAP data</p>
                        </div>
                    </div>
                    <div className="header-status" style={{ color: '#6c5ce7' }}>
                        <Icon emoji="⚡" size={14} />
                        <span>{message}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="jsonpath-main">
                {/* Left Panel - Configuration */}
                <div className="jsonpath-sidebar">
                    <div className="sidebar-content">
                        {/* Environment */}
                        <div className="form-group">
                            <label className="form-label">
                                <Icon emoji="🌍" size={14} className="label-icon" />
                                Environment
                            </label>
                            <select
                                value={environment}
                                onChange={(e) => setEnvironment(e.target.value)}
                                className="form-select"
                            >
                                {environments.map(env => (
                                    <option key={env.key} value={env.key}>{env.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Service */}
                        <div className="form-group">
                            <label className="form-label">
                                <Icon emoji="⚙️" size={14} className="label-icon" />
                                API Service
                            </label>
                            <select
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                                className="form-select"
                            >
                                {Object.entries(services).map(([key, service]) => (
                                    <option key={key} value={key}>{service.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Endpoint */}
                        <div className="form-group">
                            <label className="form-label">
                                <Icon emoji="📄" size={14} className="label-icon" />
                                Endpoint Path
                            </label>
                            <input
                                type="text"
                                value={endpoint}
                                onChange={(e) => setEndpoint(e.target.value)}
                                placeholder="/studies/KAP123456"
                                className="form-input"
                            />
                            <p className="url-preview">
                                https://{environment}-{selectedService.replace('-', '')}.azurewebsites.net{endpoint}
                            </p>
                        </div>

                        {/* Token */}
                        <div className="form-group">
                            <label className="form-label">
                                <Icon emoji="🔑" size={14} className="label-icon" />
                                Dev Token
                            </label>
                            <div className="token-input-container">
                                <input
                                    type={showToken ? 'text' : 'password'}
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="x-jetstream-devtoken"
                                    className="form-input"
                                />
                                <button
                                    onClick={() => setShowToken(!showToken)}
                                    className="token-toggle"
                                >
                                    {showToken ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* JSONPath Query */}
                        <div className="form-group">
                            <label className="form-label">
                                <Icon emoji="🔍" size={14} className="label-icon" />
                                JSONPath Query
                            </label>
                            <input
                                type="text"
                                value={jsonPathQuery}
                                onChange={(e) => {
                                    setJsonPathQuery(e.target.value);
                                    // Aplicar automáticamente si hay datos
                                    if (apiResponse) {
                                        setTimeout(() => applyJsonPath(), 300);
                                    }
                                }}
                                placeholder="$.data[*].participant"
                                className="form-input"
                            />
                        </div>

                        {/* JSONPath Examples */}
                        <div className="form-group">
                            <label className="form-label">JSONPath Examples</label>
                            <div className="examples-container">
                                {examples.map((example, index) => (
                                    <button
                                        key={index}
                                        onClick={() => useExample(example)}
                                        className="example-btn"
                                        title={example.description}
                                    >
                                        <div className="example-query">{example.query}</div>
                                        <div className="example-name">{example.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <button
                                onClick={simulateApiRequest}
                                disabled={!token.trim()}
                                className="execute-btn"
                            >
                                <Icon emoji="🎭" size={16} />
                                Simulate Request
                            </button>
                            <button
                                onClick={clear}
                                className="clear-btn"
                            >
                                <Icon emoji="🔄" size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="jsonpath-results">
                    {/* API Response */}
                    <div className="result-panel">
                        <div className="result-header">
                            <h3>
                                <Icon emoji="📄" size={18} className="header-icon" />
                                API Response (Sample Data)
                            </h3>
                            {apiResponse && (
                                <button
                                    onClick={() => copyToClipboard(apiResponse)}
                                    className="copy-btn"
                                >
                                    <Icon emoji="📋" size={14} />
                                    Copy
                                </button>
                            )}
                        </div>
                        <div className="result-content">
                            <pre className="response-text">
                                {apiResponse || 'Click "Simulate Request" to load sample KAP study data...'}
                            </pre>
                        </div>
                    </div>

                    {/* JSONPath Results */}
                    <div className="result-panel">
                        <div className="result-header">
                            <h3>
                                <Icon emoji="⚡" size={18} className="header-icon" />
                                JSONPath Results
                            </h3>
                            {jsonPathResult && (
                                <button
                                    onClick={() => copyToClipboard(jsonPathResult)}
                                    className="copy-btn"
                                >
                                    <Icon emoji="📋" size={14} />
                                    Copy
                                </button>
                            )}
                        </div>
                        <div className="result-content">
                            <pre className="jsonpath-text">
                                {jsonPathResult || 'JSONPath results will appear here after loading data and applying queries...'}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JSONPathTool;
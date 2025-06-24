// src/components/PostItNotes.tsx
import { useState, useEffect } from 'react';
import './PostItNotes.css';

interface PostItNotesProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath?: string;
}

interface Note {
    id: number;
    title: string;
    content: string;
    color: string;
    timestamp: string;
    position: { x: number; y: number };
}

type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

const PostItNotes: React.FC<PostItNotesProps> = ({ isOpen, onClose, workspacePath }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
    const [draggedNote, setDraggedNote] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Load notes from localStorage when component mounts
    useEffect(() => {
        const savedNotes = localStorage.getItem('postit-notes');
        if (savedNotes) {
            try {
                setNotes(JSON.parse(savedNotes));
            } catch (error) {
                console.error('Error loading notes:', error);
                setNotes([]);
            }
        }
    }, []);

    // Save notes to localStorage
    const saveNotes = (notesToSave: Note[]) => {
        localStorage.setItem('postit-notes', JSON.stringify(notesToSave));
        setNotes(notesToSave);
    };

    // Generate random position for new note - Responsive
    const getRandomPosition = (): { x: number; y: number } => {
        const noteWidth = window.innerWidth <= 768 ? 200 : window.innerWidth <= 1024 ? 220 : 280;
        const noteHeight = window.innerWidth <= 768 ? 140 : window.innerWidth <= 1024 ? 160 : 200;
        
        // En móviles, no usar posicionamiento aleatorio
        if (window.innerWidth <= 768) {
            return { x: 0, y: 0 }; // Se manejará con CSS
        }
        
        const boardWidth = window.innerWidth - 100;
        const boardHeight = window.innerHeight - 200;
        
        // Ajustar para pantallas más pequeñas
        const padding = window.innerWidth <= 1024 ? 10 : 20;
        const maxX = Math.max(boardWidth - noteWidth - (padding * 2), 0);
        const maxY = Math.max(boardHeight - noteHeight - (padding * 2), 0);
        
        return {
            x: Math.random() * maxX + padding,
            y: Math.random() * maxY + padding
        };
    };

    // Add new note
    const addNote = () => {
        const newNote: Note = {
            id: Date.now(),
            title: '',
            content: '',
            color: selectedColor,
            timestamp: new Date().toLocaleString('en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            position: getRandomPosition()
        };

        const updatedNotes = [newNote, ...notes];
        saveNotes(updatedNotes);
        
        // Focus the title of the new note
        setTimeout(() => {
            const titleElement = document.querySelector(`[data-note-id="${newNote.id}"] .note-title`) as HTMLTextAreaElement;
            if (titleElement) {
                titleElement.focus();
            }
        }, 100);
    };

    // Show notification
    const showNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        // Remove existing notification if there is one
        const existingNotification = document.querySelector('.copy-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `copy-notification copy-notification-${type}`;
        notification.textContent = message;
        
        // Base styles
        let baseStyles = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            animation: slideInNotification 0.3s ease-out;
            max-width: 300px;
            text-align: center;
        `;

        // Add type-specific styles
        if (type === 'success') {
            baseStyles += 'border-color: rgba(76, 175, 80, 0.5); background: rgba(76, 175, 80, 0.15);';
        } else if (type === 'warning') {
            baseStyles += 'border-color: rgba(255, 193, 7, 0.5); background: rgba(255, 193, 7, 0.15);';
        } else if (type === 'error') {
            baseStyles += 'border-color: rgba(244, 67, 54, 0.5); background: rgba(244, 67, 54, 0.15);';
        }

        notification.style.cssText = baseStyles;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    };

    // Show confirmation dialog
    const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
        // Remove existing confirmation
        const existingConfirmation = document.querySelector('.custom-confirmation');
        if (existingConfirmation) {
            existingConfirmation.remove();
        }

        // Create confirmation dialog
        const confirmationHTML = `
            <div class="custom-confirmation" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 20000;
                animation: confirmationFadeIn 0.2s ease-out;
            ">
                <div class="confirmation-backdrop" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                "></div>
                <div class="confirmation-modal" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(26, 29, 58, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 16px;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
                    min-width: 320px;
                    max-width: 400px;
                    animation: confirmationSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                ">
                    <div style="padding: 24px; text-align: center;">
                        <h3 style="
                            color: #ffffff;
                            font-size: 18px;
                            font-weight: 700;
                            margin: 0 0 12px 0;
                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                        ">${title}</h3>
                        <p style="
                            color: rgba(255, 255, 255, 0.8);
                            font-size: 14px;
                            margin: 0 0 24px 0;
                            line-height: 1.5;
                        ">${message}</p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button class="cancel-btn" style="
                                padding: 10px 20px;
                                border: 1px solid rgba(160, 163, 189, 0.3);
                                border-radius: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                min-width: 80px;
                                background: rgba(160, 163, 189, 0.15);
                                color: rgba(255, 255, 255, 0.8);
                            ">Cancel</button>
                            <button class="confirm-btn" style="
                                padding: 10px 20px;
                                border: 1px solid rgba(244, 67, 54, 0.4);
                                border-radius: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                min-width: 80px;
                                background: rgba(244, 67, 54, 0.2);
                                color: #ef4444;
                            ">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confirmationFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes confirmationSlideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = confirmationHTML;
        const confirmation = tempDiv.firstElementChild as HTMLElement;
        document.body.appendChild(confirmation);

        const closeConfirmation = () => {
            confirmation.remove();
            style.remove();
        };

        // Handle button clicks
        const cancelBtn = confirmation.querySelector('.cancel-btn');
        const confirmBtn = confirmation.querySelector('.confirm-btn');

        cancelBtn?.addEventListener('click', () => {
            closeConfirmation();
            showNotification('✖️ Deletion cancelled', 'info');
        });

        confirmBtn?.addEventListener('click', () => {
            closeConfirmation();
            onConfirm();
        });

        // Close on backdrop click
        confirmation.querySelector('.confirmation-backdrop')?.addEventListener('click', () => {
            closeConfirmation();
            showNotification('✖️ Deletion cancelled', 'info');
        });
    };

    // Delete note with confirmation
    const deleteNote = (id: number) => {
        showConfirmation(
            '🗑️ Delete this note?',
            'This action cannot be undone',
            () => {
                const updatedNotes = notes.filter(note => note.id !== id);
                saveNotes(updatedNotes);
                showNotification('🗑️ Note deleted successfully', 'success');
            }
        );
    };

    // Duplicate note
    const duplicateNote = (id: number) => {
        const originalNote = notes.find(note => note.id === id);
        if (originalNote) {
            const duplicatedNote: Note = {
                ...originalNote,
                id: Date.now(),
                title: originalNote.title ? `${originalNote.title} (copy)` : '',
                timestamp: new Date().toLocaleString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                position: {
                    x: originalNote.position.x + 20,
                    y: originalNote.position.y + 20
                }
            };
            const updatedNotes = [duplicatedNote, ...notes];
            saveNotes(updatedNotes);
        }
    };

    // Update note content
    const updateNote = (id: number, field: keyof Note, value: string) => {
        const updatedNotes = notes.map(note => 
            note.id === id ? { ...note, [field]: value } : note
        );
        saveNotes(updatedNotes);
    };

    // Change note color
    const changeNoteColor = (id: number) => {
        const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
        const note = notes.find(note => note.id === id);
        if (note) {
            const currentIndex = colors.indexOf(note.color as NoteColor);
            const nextIndex = (currentIndex + 1) % colors.length;
            updateNote(id, 'color', colors[nextIndex]);
        }
    };

    // Copy note content to clipboard (content only, no title)
    const copyNoteContent = async (id: number) => {
        const note = notes.find(note => note.id === id);
        if (note) {
            const textToCopy = note.content.trim();
            
            if (!textToCopy) {
                showNotification('⚠️ No content to copy', 'warning');
                return;
            }
            
            try {
                await navigator.clipboard.writeText(textToCopy);
                showNotification('📋 Content copied to clipboard', 'success');
            } catch {
                // Fallback for browsers that don't support clipboard API
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showNotification('📋 Content copied to clipboard', 'success');
                } catch {
                    showNotification('❌ Error copying content', 'error');
                }
            }
        }
    };

    // Handle note movement - Responsive
    const handleMouseDown = (e: React.MouseEvent, note: Note) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('note-content') || 
            target.classList.contains('note-title') ||
            target.classList.contains('postit-note-action')) {
            return; // Don't move if editing or using buttons
        }

        // Disable dragging on mobile
        if (window.innerWidth <= 768) {
            return;
        }

        setIsDragging(true);
        setDraggedNote(note.id);

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const handleMouseMove = (e: MouseEvent) => {
            const boardRect = document.querySelector('.notes-board')?.getBoundingClientRect();
            if (!boardRect) return;

            // Responsive note width
            const noteWidth = window.innerWidth <= 1024 ? 220 : 280;
            const noteHeight = window.innerWidth <= 1024 ? 160 : 200;

            const newX = Math.max(0, Math.min(e.clientX - boardRect.left - offsetX, boardRect.width - noteWidth));
            const newY = Math.max(0, Math.min(e.clientY - boardRect.top - offsetY, boardRect.height - noteHeight));

            const noteElement = document.querySelector(`[data-note-id="${note.id}"]`) as HTMLElement;
            if (noteElement) {
                noteElement.style.left = `${newX}px`;
                noteElement.style.top = `${newY}px`;
            }
        };

        const handleMouseUp = () => {
            if (isDragging && draggedNote) {
                const noteElement = document.querySelector(`[data-note-id="${note.id}"]`) as HTMLElement;
                if (noteElement && window.innerWidth > 768) {
                    const newX = parseInt(noteElement.style.left);
                    const newY = parseInt(noteElement.style.top);
                    
                    const updatedNotes = notes.map(n => 
                        n.id === note.id ? { ...n, position: { x: newX, y: newY } } : n
                    );
                    saveNotes(updatedNotes);
                }

                setIsDragging(false);
                setDraggedNote(null);
            }

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    if (!isOpen) return null;

    return (
        <div className="postit-notes-backdrop">
            <div className="postit-notes-container">
                {/* Header */}
                <header className="postit-app-header">
                    <div className="postit-header-left">
                        <div className="postit-app-icon">📝</div>
                        <h1 className="postit-app-title">Post-it Notes</h1>
                    </div>
                    
                    <div className="postit-header-controls">
                        <div className="postit-color-palette">
                            {(['yellow', 'pink', 'blue', 'green', 'purple', 'orange'] as NoteColor[]).map(color => (
                                <div
                                    key={color}
                                    className={`postit-color-option postit-color-${color} ${selectedColor === color ? 'active' : ''}`}
                                    onClick={() => setSelectedColor(color)}
                                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                                />
                            ))}
                        </div>
                        
                        <button className="postit-add-note-btn" onClick={addNote}>
                            <span>➕</span>
                            New Note
                        </button>

                        <button className="postit-close-btn" onClick={onClose} title="Close">
                            ✕
                        </button>
                    </div>
                </header>

                {/* Notes board */}
                <main className="notes-board">
                    {notes.length === 0 ? (
                        <div className="postit-empty-state">
                            <div className="postit-empty-icon">📝</div>
                            <h2 className="postit-empty-title">Create your first note!</h2>
                            <p className="postit-empty-subtitle">
                                Click "New Note" to start organizing your ideas with style
                            </p>
                        </div>
                    ) : (
                        notes.map(note => (
                            <div
                                key={note.id}
                                className={`postit-note postit-note-${note.color} ${isDragging && draggedNote === note.id ? 'dragging' : ''}`}
                                data-note-id={note.id}
                                style={{
                                    left: `${note.position.x}px`,
                                    top: `${note.position.y}px`
                                }}
                                onMouseDown={(e) => handleMouseDown(e, note)}
                            >
                                <div className="postit-note-header">
                                    <span className="postit-note-timestamp">{note.timestamp}</span>
                                    <div className="postit-note-actions">
                                        <button className="postit-note-action" onClick={() => copyNoteContent(note.id)} title="Copy content">
                                            📋
                                        </button>
                                        <button className="postit-note-action" onClick={() => changeNoteColor(note.id)} title="Change color">
                                            🎨
                                        </button>
                                        <button className="postit-note-action" onClick={() => duplicateNote(note.id)} title="Duplicate">
                                            📄
                                        </button>
                                        <button className="postit-note-action" onClick={() => deleteNote(note.id)} title="Delete">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <textarea 
                                    className="note-title" 
                                    placeholder="Note title..."
                                    value={note.title}
                                    onChange={(e) => updateNote(note.id, 'title', e.target.value)}
                                    rows={1}
                                />
                                <textarea 
                                    className="note-content" 
                                    placeholder="Write your note here..."
                                    value={note.content}
                                    onChange={(e) => updateNote(note.id, 'content', e.target.value)}
                                />
                            </div>
                        ))
                    )}
                </main>
            </div>
        </div>
    );
};

export default PostItNotes;
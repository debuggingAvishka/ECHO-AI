
import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [backendStatus, setBackendStatus] = useState<
    'checking' | 'online' | 'offline'
  >('checking')
  const greeting =
    language === 'en' ? 'Good evening.' : 'शुभ संध्या।'

  const subtitle =
    language === 'en'
      ? "I'm listening. What would you like to do?"
      : 'मैं सुन रही हूँ। आप क्या करना चाहेंगे?'
  const startRecording = async () => {
    try {
      setError('')
      setAudioUrl(null)

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported by this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      streamRef.current = stream
      audioChunksRef.current = []

      const recorder = new MediaRecorder(stream)

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        })

        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while accessing the microphone.',
      )
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current

    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }

    setIsRecording(false)
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      void startRecording()
    }
  }
  useEffect(() => {
    const controller = new AbortController()

    const checkBackend = async () => {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/health',
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('Backend request failed')
        }

        const data: { status: string } = await response.json()

        setBackendStatus(
          data.status === 'healthy' ? 'online' : 'offline',
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

        setBackendStatus('offline')
      }
    }

    void checkBackend()

    return () => controller.abort()
  }, [])
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">E</div>
          <span>ECHO</span>
        </div>

        <div className="status">
          <span
            className={`status-dot ${backendStatus === 'offline' ? 'offline' : ''
              }`}
          />

          {backendStatus === 'checking' && 'Connecting...'}
          {backendStatus === 'online' && 'Backend online'}
          {backendStatus === 'offline' && 'Backend offline'}
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR PERSONAL AI ASSISTANT</p>

        <h1>{greeting}</h1>
        <p className="subtitle">{subtitle}</p>

        <button
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          type="button"
          onClick={handleMicClick}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span>{isRecording ? '⏹' : '🎙'}</span>
        </button>

        <p className="mic-label">
          {isRecording ? 'Listening... Click to stop' : 'Click to start speaking'}
        </p>

        {error && <p className="error-message">{error}</p>}

        {audioUrl && (
          <div className="audio-preview">
            <p>Recording captured successfully!</p>
            <audio controls src={audioUrl} />
          </div>
        )}
      </section>

      <section className="conversation">
        <h2>RECENT CONVERSATION</h2>
        <div className="empty-state">
          <p>No conversations yet.</p>
          <span>Your conversations will appear here.</span>
        </div>
      </section>

      <footer className="footer">
        <span>Made for you, locally.</span>

        <div className="language-switch">
          <button
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            English
          </button>

          <button
            className={language === 'hi' ? 'active' : ''}
            onClick={() => setLanguage('hi')}
          >
            हिंदी
          </button>
        </div>
      </footer>
    </main>
  )
}

export default App

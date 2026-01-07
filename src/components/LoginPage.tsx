import { useAuth } from '../hooks/useAuth'
import { getMicrosoftLoginUrl, getGoogleLoginUrl } from '../api/auth'

export default function LoginPage() {
  const { devLogin } = useAuth()

  const handleMicrosoftLogin = () => {
    window.location.href = getMicrosoftLoginUrl()
  }

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl()
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center border-4 border-black animate-float"
                 style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-brutal)' }}>
              <span className="text-3xl">✦</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            EigenTask
          </h1>
          <div className="w-32 h-1 mx-auto mb-4 rounded-full" style={{ background: 'var(--color-accent)' }}></div>
          <h2 className="text-xl font-medium" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
            Your Personal Chief of Staff
          </h2>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="card-brutal py-8 px-6 sm:px-10 rounded-2xl animate-slide-in">
          <div className="space-y-4">
            <p className="text-sm font-medium text-center mb-6" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Choose your preferred sign-in method
            </p>

            <button
              onClick={handleMicrosoftLogin}
              className="btn-brutal w-full flex justify-center items-center gap-3 py-4 px-6 rounded-lg"
              style={{ background: 'var(--color-primary)' }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M12 12h11.5v11.5H12V12zm-12 0h11.5v11.5H0V12zm0-12h11.5v11.5H0V0zm12 0h11.5v11.5H12V0z"
                />
              </svg>
              <span className="text-white font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Continue with Microsoft
              </span>
            </button>

            <button
              onClick={handleGoogleLogin}
              className="btn-brutal w-full flex justify-center items-center gap-3 py-4 px-6 rounded-lg"
              style={{ background: 'var(--color-accent)' }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="white"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="white"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="white"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-white font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Continue with Google
              </span>
            </button>

            {import.meta.env.DEV && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-black/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 py-1 rounded-md border-2 border-black text-xs font-bold"
                        style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                    Development Only
                  </span>
                </div>
              </div>
            )}

            {import.meta.env.DEV && (
              <button
                onClick={devLogin}
                className="btn-brutal w-full flex justify-center items-center gap-3 py-4 px-6 rounded-lg"
                style={{ background: 'var(--color-text)' }}
              >
                <span className="text-2xl">👨‍💻</span>
                <span className="text-white font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  Dev Login
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center z-10">
        <p className="text-sm font-medium px-6 py-2 inline-block rounded-lg border-2 border-black"
           style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
          Manage your tasks, projects, and goals with AI-powered recommendations
        </p>
      </div>
    </div>
  )
}
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EigenTask</h1>
          <h2 className="text-xl text-gray-600 mb-8">Your Personal Chief of Staff</h2>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-6">
              Sign in with your Microsoft account to get started
            </p>
            
            <button
              onClick={login}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#00A1F1"
                  d="M12 12h11.5v11.5H12V12zm-12 0h11.5v11.5H0V12zm0-12h11.5v11.5H0V0zm12 0h11.5v11.5H12V0z"
                />
              </svg>
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Manage your tasks, projects, and goals with AI-powered recommendations
        </p>
      </div>
    </div>
  )
}
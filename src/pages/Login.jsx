import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import logo from "../assets/logo.png";
import { FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    // Prevent form default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔐 Login form submitted');
    console.log('📝 Username:', username);
    console.log('📝 Password length:', password.length);
    
    setError('');
    setLoading(true);

    try {
      console.log('📡 Sending login request to:', axios.defaults.baseURL);
      const res = await axios.post('/auth/login', { username, password });
      console.log('✅ Login successful! Response:', res.data);
      const data = res.data;

      console.log('💾 Saving to localStorage...');
      console.log('👤 User data from backend:', data.user);
      console.log('🎭 User role:', data.user.role);
      
      const userToSave = { ...data.user, _id: data.user.id || data.user._id };
      console.log('📦 User object to save:', userToSave);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem("user", JSON.stringify(userToSave));
      localStorage.setItem('loginTime', Date.now());
      
      console.log('✅ Saved to localStorage');
      console.log('🔍 Verify saved user:', localStorage.getItem('user'));

      console.log('🚀 Navigating to /dashboard...');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('❌ Error response:', err?.response);
      console.error('❌ Error data:', err?.response?.data);
      
      let errorMessage;
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = '❌ Cannot connect to server. Please ensure backend is running on port 5001.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid username or password. Please try again.';
      } else {
        errorMessage = err?.response?.data?.message || err?.message || 'Login failed. Please try again.';
      }
      
      console.error('❌ Final error message:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('🏁 Login process finished, loading:', false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center px-4">
      {/* Container with consistent mobile width */}
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6 inline-block">
            <img src={logo} alt="Laxmi Powertech" className="h-24 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
          <p className="text-gray-600 text-sm">Sign in to continue to your account</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">
                LOGIN TO YOUR ACCOUNT
              </h2>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-shake">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">!</span>
                </div>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FaUser className="text-gray-400" size={14} />
                  <span>Username</span>
                </div>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaUser size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FaLock className="text-gray-400" size={14} />
                  <span>Password</span>
                </div>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaLock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a href="#" className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors">
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <FaSignInAlt size={18} />
                  <span>LOG IN</span>
                </>
              )}
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help? <a href="#" className="text-orange-600 font-medium hover:underline">Contact Support</a>
          </p>
          <p className="text-xs text-gray-400 mt-4">
            © 2025 Laxmi Power Tech. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
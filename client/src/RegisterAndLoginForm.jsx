/* eslint-disable react/no-unescaped-entities */
import { useContext, useState } from "react";
import axios from 'axios';
import { UserContext } from "./UserContext.jsx";

function RegisterAndLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  async function handleSubmit(ev) {
    ev.preventDefault();
    // Reset previous errors
    setUsernameError('');
    setPasswordError('');
    setEmailError('');
    setConfirmPasswordError('');

    // Validation checks
    let hasError = false;
    
    if (!username.trim()) {
      setUsernameError('Username is required');
      hasError = true;
    }
    
    if (!password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      hasError = true;
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password)) {
      setPasswordError('Password must include at least one letter, one number, and one special character');
      hasError = true;
    }

    if (isLoginOrRegister === 'register') {
      if (!email.trim()) {
        setEmailError('Email is required');
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError('Email is invalid');
        hasError = true;
      }

      if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        hasError = true;
      }
    }

    if (hasError) {
      return;
    }

    const url = isLoginOrRegister === 'register' ? '/register' : '/login';
    const data = isLoginOrRegister === 'register' ? { username, password, email } : { username, password };

    try {
      const response = await axios.post(url, data);
      if (isLoginOrRegister === 'register') {
        setShowPopup(true);
      } else {
        setLoggedInUsername(username);
        setId(response.data.id);
      }
      setError('');
    } catch (err) {
      setError('Registration or login failed. Please try again.');
      console.error(err);
    }
  }

  function handlePopupClose() {
    setShowPopup(false);
    setIsLoginOrRegister('login');
    setUsername('');
    setPassword('');
    setEmail('');
    setConfirmPassword('');
  }

  return (
    <div className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 min-h-screen flex items-center justify-center p-4">
      <form className="w-full max-w-md p-10 bg-white rounded-3xl shadow-2xl transition-transform duration-300 hover:scale-105" onSubmit={handleSubmit}>
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white">AB</span>
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
            {isLoginOrRegister === 'register' ? 'Create an Account' : 'Log In'}
          </h2>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="mb-6">
          <input
            value={username}
            onChange={ev => setUsername(ev.target.value)}
            type="text"
            placeholder="Username"
            className="block w-full px-5 py-4 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500"
          />
          {usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
        </div>
        {isLoginOrRegister === 'register' && (
          <>
            <div className="mb-6">
              <input
                value={email}
                onChange={ev => setEmail(ev.target.value)}
                type="email"
                placeholder="Email"
                className="block w-full px-5 py-4 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500"
              />
              {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
            </div>
            <div className="mb-6">
              <input
                value={confirmPassword}
                onChange={ev => setConfirmPassword(ev.target.value)}
                type="password"
                placeholder="Confirm Password"
                className="block w-full px-5 py-4 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500"
              />
              {confirmPasswordError && <p className="text-red-500 text-sm mt-1">{confirmPasswordError}</p>}
            </div>
          </>
        )}
        <div className="mb-6">
          <input
            value={password}
            onChange={ev => setPassword(ev.target.value)}
            type="password"
            placeholder="Password"
            className="block w-full px-5 py-4 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500"
          />
          {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 rounded-full hover:from-blue-600 hover:to-purple-600 transition duration-300 transform hover:scale-105"
        >
          {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
        </button>
        <div className="text-center mt-4">
          {isLoginOrRegister === 'register' ? (
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                className="text-purple-500 hover:underline focus:outline-none"
                onClick={() => setIsLoginOrRegister('login')}
              >
                Log In here
              </button>
            </p>
          ) : (
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-purple-500 hover:underline focus:outline-none"
                onClick={() => setIsLoginOrRegister('register')}
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </form>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center transition-transform duration-300 hover:scale-105">
            <h3 className="text-2xl mb-4">Successfully Registered</h3>
            <button
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-2 px-4 rounded-full hover:from-blue-600 hover:to-purple-600 transition duration-300"
              onClick={handlePopupClose}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterAndLoginForm;

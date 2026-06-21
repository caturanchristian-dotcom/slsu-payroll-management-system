import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { LogIn, Eye, EyeOff, Home, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('caturanchristian@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setEmail('caturanchristian@gmail.com');
    setPassword('admin123');
    toast.success('Default administrator credentials loaded!');
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9] flex items-center justify-center p-4">
      {/* Outer Card with box shadow matching the style of the design */}
      <div className="w-full max-w-[950px] bg-white rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-neutral-100/80 flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Form Section */}
        <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white border-r border-neutral-50">
          <div className="text-center mb-10 select-none">
            <h1 className="text-[#355275] font-extrabold text-2xl tracking-wider uppercase font-sans leading-tight">
              Southern Leyte State University
            </h1>
            <p className="text-[#355275] font-extrabold text-lg tracking-widest mt-1 font-sans">
              (PAYROLL)
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Campus dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#355275] tracking-widest uppercase font-sans block">
                CAMPUS
              </label>
              <select
                className="w-full h-11 px-3.5 bg-[#fbfcfd] border border-[#c9d4e4] rounded-lg text-neutral-700 text-[13.5px] font-medium font-sans focus:outline-none focus:ring-1 focus:ring-[#1d58d9] focus:border-[#1d58d9] transition-all cursor-pointer"
                defaultValue="hinunangan"
              >
                <option value="hinunangan">Hinunangan Campus</option>
                <option value="main">Sogod (Main) Campus</option>
                <option value="tomas">Tomas Oppus Campus</option>
                <option value="bontoc">Bontoc Campus</option>
                <option value="sanjuan">San Juan Campus</option>
              </select>
            </div>

            {/* Email Address element styled perfectly */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#355275] tracking-widest uppercase font-sans block">
                EMAIL ADDRESS
              </label>
              <input 
                id="email" 
                type="email" 
                placeholder="email@example.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-3.5 bg-[#fbfcfd] border border-[#c9d4e4] rounded-lg text-[13.5px] text-neutral-800 placeholder-neutral-400 font-medium font-sans focus:outline-none focus:ring-1 focus:ring-[#1d58d9] focus:border-[#1d58d9] transition-all"
              />
            </div>

            {/* Password input with toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#355275] tracking-widest uppercase font-sans block">
                PASSWORD
              </label>
              <div className="relative">
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-11 bg-[#fbfcfd] border border-[#c9d4e4] rounded-lg text-[13.5px] text-neutral-800 placeholder-neutral-400 font-medium font-sans focus:outline-none focus:ring-1 focus:ring-[#1d58d9] focus:border-[#1d58d9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#1d58d9] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between text-[13px] font-medium font-sans pt-1">
              <label className="flex items-center gap-2 text-neutral-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-[#c9d4e4] text-[#1d58d9] focus:ring-[#1d58d9] focus:ring-offset-0"
                />
                <span>Show Password</span>
              </label>
              <button
                type="button"
                onClick={() => toast.info("Please request password recovery from your campus HR Office.")}
                className="text-[#3b5998] hover:text-[#2f4982] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Double Button Section with split layouts */}
            <div className="flex gap-3.5 pt-4">
              {/* Login Split Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 h-11 flex overflow-hidden rounded bg-[#db4332] hover:bg-[#c63828] active:scale-[0.98] text-white transition-all font-sans font-bold shadow-sm cursor-pointer select-none disabled:opacity-80"
              >
                <div className="bg-[#bc3121] px-3.5 flex items-center justify-center border-r border-[#a82516]/10 h-full shrink-0">
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center text-sm tracking-wide">
                  {loading ? 'Entering...' : 'Login'}
                </div>
              </button>

              {/* Reset/Defaults Split Button */}
              <button
                type="button"
                onClick={handleResetDefaults}
                className="w-1/2 h-11 flex overflow-hidden rounded bg-[#3b5998] hover:bg-[#2f4982] active:scale-[0.98] text-white transition-all font-sans font-bold shadow-sm cursor-pointer select-none"
              >
                <div className="bg-[#2f4982]/80 px-3.5 flex items-center justify-center border-r border-[#1a305e]/10 h-full shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div className="flex-1 flex items-center justify-center text-sm tracking-wide">
                  Return Home
                </div>
              </button>
            </div>
          </form>
        </div>

        {/* Right Illustration Section */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#1d4ed8] p-12 items-center justify-center relative overflow-hidden">
          {/* Ambient background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl -ml-24 -mb-24" />
          
          <div className="max-w-[380px] w-full flex flex-col items-center justify-center text-center relative z-10 text-white select-none">
            {/* Highly polished University Crest / Seal Container */}
            <div className="w-36 h-36 rounded-full bg-white/10 backdrop-blur-md p-4 shadow-[0_12px_36px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center mb-8 transform transition-transform duration-500 hover:scale-[1.05]">
              <img 
                src="/api/slsu-logo.png" 
                alt="Southern Leyte State University Seal" 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Southern_Leyte_State_University_seal.png';
                }}
                referrerPolicy="no-referrer"
              />
            </div>
            
            <h2 className="text-2xl font-extrabold tracking-tight mb-3 font-sans">
              SLSU Portal
            </h2>
            <div className="h-1 w-16 bg-amber-400 rounded-full mb-5" />
            <p className="text-white/85 text-xs md:text-sm font-medium leading-relaxed max-w-[300px] font-sans">
              Secure integrated system for payroll processing, human resource management, and campus administration.
            </p>
            
            <div className="mt-8 flex gap-2.5 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold text-amber-300 tracking-wider">
              <span>EST. 2004</span>
              <span className="text-white/20">•</span>
              <span>ADMIN SYSTEM</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;

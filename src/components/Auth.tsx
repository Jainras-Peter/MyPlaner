import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';

export default function Auth() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-10 text-center relative z-10"
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center font-display font-bold text-3xl text-white mx-auto mb-6 shadow-lg shadow-primary/20">F</div>
        <h1 className="text-4xl font-display font-bold tracking-tight mb-2">Forge<span className="text-primary">OS</span></h1>
        <p className="text-text-muted mb-10">Your personal growth, study, and fitness operating system.</p>

        <button 
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-100 px-6 py-4 rounded-xl font-bold transition-all active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-xs text-text-muted mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/landing'); // Changed from /intro to /landing
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-8xl font-bold text-black tracking-tight">GOJI</h1>
      </motion.div>
    </div>
  );
}
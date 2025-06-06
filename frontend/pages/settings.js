import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Settings() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to profile page
    router.replace('/profile');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="text-[#10B981] text-xl font-semibold">Redirecting to profile...</div>
    </div>
  );
} 
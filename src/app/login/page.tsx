
import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <div className="absolute inset-0 opacity-10">
            <Image 
                src="https://picsum.photos/1920/1080" 
                alt="Background" 
                layout="fill" 
                objectFit="cover" 
                data-ai-hint="office workspace"
            />
        </div>
        <LoginForm />
    </div>
  );
}

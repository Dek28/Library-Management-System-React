import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, PasswordInput, Checkbox } from '../../components/ui';
import { useAuthStore } from '../../store/auth';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email, registration or staff number'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean().optional(),
});

export default function Login() {
  const [formError, setFormError] = useState(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '', remember: true },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const user = await login({ identifier: values.identifier, password: values.password });
      toast.success(`Welcome back, ${user.firstName}`);

      // Return the user to whatever they were trying to reach.
      const destination = location.state?.from?.pathname
        || (user.mustChangePassword ? '/profile?tab=security' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(error.message || 'Unable to sign in');
    }
  };

  return (
    <div className="rounded-xl border border-line bg-panel p-6 sm:p-8">
      <h1 className="text-center text-xl font-semibold text-slate-900">Sign in to your account</h1>
      <p className="mt-1.5 text-center text-sm text-slate-500">
        Use your university email, registration number or staff ID.
      </p>

      {formError && (
        <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email address or ID"
          placeholder="Enter your email"
          autoComplete="username"
          autoFocus
          error={errors.identifier?.message}
          {...register('identifier')}
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" {...register('remember')} />
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Trouble signing in? Contact the library circulation desk.
      </p>
    </div>
  );
}

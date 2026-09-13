import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Mail, Loader2 } from "lucide-react";
import { useLogin } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import { ru } from "@/shared/i18n/ru";

const loginSchema = z.object({
  email: z.string().email({ message: ru.auth.errors.invalidEmail }),
  password: z.string().min(8, { message: ru.auth.errors.passwordTooShort }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { mutate: login, isPending } = useLogin();
  const closeAuthModal = useAuthUIStore((state) => state.closeAuthModal);
  const setAuthModalTab = useAuthUIStore((state) => state.setAuthModalTab);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(data, {
      onSuccess: () => {
        toast.success(ru.auth.loginSuccess);
        closeAuthModal();
      },
      onError: (err: any) => {
        const detail =
          err?.response?.data?.detail || ru.auth.errors.generic;
        toast.error(typeof detail === "string" ? detail : ru.auth.errors.generic);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
          {ru.auth.email}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="email"
            placeholder={ru.auth.emailPlaceholder}
            {...register("email")}
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 pl-10 pr-3 py-2 text-sm rounded font-mono focus:outline-none focus:border-amber-400"
          />
        </div>
        {errors.email && (
          <p className="text-xs text-rose-400 mt-1 font-mono">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
          {ru.auth.password}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="password"
            placeholder={ru.auth.passwordPlaceholder}
            {...register("password")}
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 pl-10 pr-3 py-2 text-sm rounded font-mono focus:outline-none focus:border-amber-400"
          />
        </div>
        {errors.password && (
          <p className="text-xs text-rose-400 mt-1 font-mono">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {ru.auth.submitting}
          </>
        ) : (
          ru.auth.submitLogin
        )}
      </button>

      <div className="pt-2 text-center text-xs font-mono text-neutral-400">
        <span>{ru.auth.noAccount} </span>
        <button
          type="button"
          onClick={() => setAuthModalTab("register")}
          className="text-amber-400 hover:underline cursor-pointer"
        >
          {ru.auth.switchToRegister}
        </button>
      </div>
    </form>
  );
}

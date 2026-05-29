import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-display text-5xl md:text-7xl font-semibold text-foreground leading-tight mb-4">
        Coloring pages,{" "}
        <span className="text-coral-500">made by AI.</span>
      </h1>
      <p className="font-body text-ink-600 text-lg md:text-xl max-w-xl mb-10">
        Describe any scene, character, or pattern — and get a print-ready
        coloring page in seconds.
      </p>
      <Link
        href="/signup"
        className="bg-coral-500 hover:bg-coral-600 text-white font-body font-semibold text-lg px-8 py-4 rounded-2xl transition-colors"
      >
        Start for free
      </Link>
      <p className="mt-4 text-ink-400 text-sm font-body">
        Already have an account?{" "}
        <Link href="/login" className="text-coral-500 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

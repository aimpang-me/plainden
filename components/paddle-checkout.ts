type PaddleCheckout = {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (options: { token: string }) => void;
  Checkout: {
    open: (options: {
      transactionId: string;
      customer: { email: string };
      settings?: { successUrl?: string };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleCheckout;
  }
}

let loading: Promise<void> | null = null;
let initialized = false;

export async function openPaddleCheckout(transactionId: string, email: string): Promise<void> {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) throw new Error("Payments are not configured.");
  await loadPaddle();
  const paddle = window.Paddle;
  if (!paddle) throw new Error("Payments are not configured.");
  if (process.env.NEXT_PUBLIC_PADDLE_ENV !== "production") paddle.Environment.set("sandbox");
  if (!initialized) {
    paddle.Initialize({ token });
    initialized = true;
  }
  paddle.Checkout.open({
    transactionId,
    customer: { email },
    settings: { successUrl: `${window.location.origin}/account?checkout=pending` },
  });
}

function loadPaddle(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payments are not configured."));
    document.head.appendChild(script);
  });
  return loading;
}

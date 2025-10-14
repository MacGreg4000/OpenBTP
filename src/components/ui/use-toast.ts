// Placeholder pour use-toast
// Ajoutez le vrai composant avec `npx shadcn-ui@latest add toast`

export function useToast() {
  return {
    toast: (options: { variant?: string; title?: string; description?: string }) => {
      console.log("Toast:", options);
      // Simule l'affichage d'un toast système si disponible, sinon console.log
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        // window.alert(`${options.title || 'Notification'}: ${options.description || ''}`);
      }
    },
  };
} 
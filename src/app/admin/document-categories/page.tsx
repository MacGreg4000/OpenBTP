import { Heading } from "@/components/ui/Heading";
import { Separator } from "@/components/ui/separator";
import { Metadata } from "next";
import DocumentCategoriesClient from "./components/DocumentCategoriesClient";

export const metadata: Metadata = {
  title: "Catégories de Documents",
  description: "Gérer les catégories de documents de l'application.",
};

export default async function DocumentCategoriesPage() {

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title="Catégories de Documents"
            description="Gérez les catégories utilisées pour classer les documents."
          />
          {/* Bouton d'ajout sera dans le composant client */}
        </div>
        <Separator />
        <DocumentCategoriesClient />
      </div>
    </div>
  );
} 
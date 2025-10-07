import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptation des conditions</h2>
            <p className="text-muted-foreground">
              En utilisant Koligo, vous acceptez d'être lié par ces conditions générales d'utilisation. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description du service</h2>
            <p className="text-muted-foreground">
              Koligo est une plateforme de transfert d'argent permettant d'envoyer de l'argent entre le Maroc 
              et d'autres pays. Nous facilitons les transactions financières en toute sécurité.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Obligations de l'utilisateur</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fournir des informations exactes et à jour</li>
              <li>Maintenir la confidentialité de vos identifiants de connexion</li>
              <li>Ne pas utiliser le service à des fins illégales</li>
              <li>Respecter les limites de transfert établies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Frais et limites</h2>
            <p className="text-muted-foreground">
              Des frais peuvent s'appliquer à certaines transactions. Les taux de change sont mis à jour 
              régulièrement. Des limites de transfert peuvent être appliquées selon votre niveau de vérification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Vérification d'identité (KYC)</h2>
            <p className="text-muted-foreground">
              Conformément aux réglementations en vigueur, nous pouvons vous demander de fournir des documents 
              d'identité pour vérifier votre compte et augmenter vos limites de transfert.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Responsabilité</h2>
            <p className="text-muted-foreground">
              Koligo s'efforce de maintenir un service fiable, mais ne peut garantir une disponibilité ininterrompue. 
              Nous ne sommes pas responsables des pertes indirectes ou consécutives.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Modification des conditions</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront 
              informés des changements importants par email ou notification dans l'application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant ces conditions, veuillez nous contacter à support@koligo.com
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Terms;

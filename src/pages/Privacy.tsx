import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
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
        <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Collecte des données</h2>
            <p className="text-muted-foreground">
              Nous collectons les informations suivantes lorsque vous utilisez Koligo :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Informations d'identification (nom, prénom, email, téléphone)</li>
              <li>Informations de transaction (montants, dates, bénéficiaires)</li>
              <li>Documents d'identité pour la vérification KYC</li>
              <li>Données techniques (adresse IP, type d'appareil, navigateur)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Utilisation des données</h2>
            <p className="text-muted-foreground">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Traiter vos transactions de transfert d'argent</li>
              <li>Vérifier votre identité et prévenir la fraude</li>
              <li>Vous envoyer des notifications importantes</li>
              <li>Améliorer nos services</li>
              <li>Respecter nos obligations légales et réglementaires</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons pas vos données personnelles. Vos informations peuvent être partagées avec :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Nos partenaires bancaires pour traiter les transactions</li>
              <li>Les autorités compétentes si requis par la loi</li>
              <li>Nos prestataires de services sous contrat de confidentialité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Sécurité des données</h2>
            <p className="text-muted-foreground">
              Nous utilisons des mesures de sécurité avancées pour protéger vos données :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Chiffrement SSL/TLS pour toutes les communications</li>
              <li>Authentification sécurisée</li>
              <li>Surveillance continue de nos systèmes</li>
              <li>Accès restreint aux données personnelles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Vos droits (RGPD)</h2>
            <p className="text-muted-foreground">
              Conformément au RGPD, vous avez le droit de :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier vos données inexactes</li>
              <li>Demander la suppression de vos données</li>
              <li>Vous opposer au traitement de vos données</li>
              <li>Demander la portabilité de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Conservation des données</h2>
            <p className="text-muted-foreground">
              Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services 
              et respecter nos obligations légales (généralement 5 ans après la dernière transaction).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez gérer vos préférences 
              de cookies dans les paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant vos données personnelles ou pour exercer vos droits, 
              contactez notre délégué à la protection des données : privacy@koligo.com
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

export default Privacy;

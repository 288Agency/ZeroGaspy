import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
}

type LegalSection = 'menu' | 'cgu' | 'privacy';

export default function LegalModal({ visible, onClose }: LegalModalProps) {
  const [currentSection, setCurrentSection] = useState<LegalSection>('menu');
  const { height } = useWindowDimensions();

  const handleClose = () => {
    setCurrentSection('menu');
    onClose();
  };

  const SectionTitle = ({ children }: { children: string }) => (
    <Text className="text-lg font-bold text-[#3C6E47] mt-6 mb-3">{children}</Text>
  );

  const Paragraph = ({ children }: { children: string }) => (
    <Text className="text-[#4A4A4A] text-sm leading-6 mb-3">{children}</Text>
  );

  const BulletPoint = ({ children }: { children: string }) => (
    <View className="flex-row ml-2 mb-2">
      <Text className="text-[#3C6E47] mr-2">•</Text>
      <Text className="text-[#4A4A4A] text-sm leading-6 flex-1">{children}</Text>
    </View>
  );

  const renderMenu = () => (
    <View>
      <Text className="text-xl font-bold text-[#3C6E47] mb-6 text-center">
        Informations legales
      </Text>

      <View className="gap-3">
        <PressableScale
          onPress={() => setCurrentSection('cgu')}
          className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 flex-row items-center"
          hapticType="light"
        >
          <View className="w-10 h-10 rounded-full bg-[#A3C9A8]/30 items-center justify-center mr-3">
            <Ionicons name="document-text-outline" size={20} color="#3C6E47" />
          </View>
          <View className="flex-1">
            <Text className="text-[#3C6E47] font-semibold">Conditions Generales d'Utilisation</Text>
            <Text className="text-[#6A8A6E] text-sm">Regles d'utilisation de l'application</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
        </PressableScale>

        <PressableScale
          onPress={() => setCurrentSection('privacy')}
          className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 flex-row items-center"
          hapticType="light"
        >
          <View className="w-10 h-10 rounded-full bg-[#A3C9A8]/30 items-center justify-center mr-3">
            <Ionicons name="shield-checkmark-outline" size={20} color="#3C6E47" />
          </View>
          <View className="flex-1">
            <Text className="text-[#3C6E47] font-semibold">Politique de Confidentialite</Text>
            <Text className="text-[#6A8A6E] text-sm">Protection de vos donnees personnelles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
        </PressableScale>
      </View>

      <View className="mt-8 p-4 bg-[#F7F5E6] rounded-xl">
        <Text className="text-[#6A8A6E] text-xs text-center">
          ZeroGaspy - Version 1.0.3
        </Text>
        <Text className="text-[#6A8A6E] text-xs text-center mt-1">
          Derniere mise a jour : Janvier 2025
        </Text>
      </View>
    </View>
  );

  const renderCGU = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('menu')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-2">
        Conditions Generales d'Utilisation
      </Text>
      <Text className="text-[#6A8A6E] text-sm mb-6">
        Derniere mise a jour : Janvier 2025
      </Text>

      <SectionTitle>1. Objet</SectionTitle>
      <Paragraph>
        Les presentes Conditions Generales d'Utilisation (CGU) ont pour objet de definir les modalites et conditions d'utilisation de l'application mobile ZeroGaspy, ainsi que les droits et obligations des utilisateurs.
      </Paragraph>

      <SectionTitle>2. Acceptation des CGU</SectionTitle>
      <Paragraph>
        L'utilisation de l'application ZeroGaspy implique l'acceptation pleine et entiere des presentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser l'application.
      </Paragraph>

      <SectionTitle>3. Description du service</SectionTitle>
      <Paragraph>
        ZeroGaspy est une application mobile gratuite permettant de :
      </Paragraph>
      <BulletPoint>Gerer l'inventaire de vos produits alimentaires</BulletPoint>
      <BulletPoint>Suivre les dates de peremption</BulletPoint>
      <BulletPoint>Recevoir des notifications avant expiration</BulletPoint>
      <BulletPoint>Consulter des recettes adaptees a vos ingredients</BulletPoint>
      <BulletPoint>Visualiser des statistiques sur votre consommation</BulletPoint>

      <SectionTitle>4. Inscription et compte utilisateur</SectionTitle>
      <Paragraph>
        L'utilisation de l'application peut se faire en mode local (sans compte) ou avec un compte utilisateur. La creation d'un compte permet la synchronisation des donnees entre appareils et leur sauvegarde dans le cloud.
      </Paragraph>
      <Paragraph>
        Vous etes responsable de la confidentialite de vos identifiants de connexion et de toutes les activites effectuees sous votre compte.
      </Paragraph>

      <SectionTitle>5. Utilisation du service</SectionTitle>
      <Paragraph>
        Vous vous engagez a utiliser l'application de maniere loyale et conformement a sa destination. Il est interdit de :
      </Paragraph>
      <BulletPoint>Tenter de contourner les mesures de securite</BulletPoint>
      <BulletPoint>Utiliser l'application a des fins illegales</BulletPoint>
      <BulletPoint>Porter atteinte au fonctionnement de l'application</BulletPoint>
      <BulletPoint>Collecter des donnees d'autres utilisateurs</BulletPoint>

      <SectionTitle>6. Propriete intellectuelle</SectionTitle>
      <Paragraph>
        L'application ZeroGaspy, son contenu, son design et ses fonctionnalites sont proteges par les droits de propriete intellectuelle. Toute reproduction, modification ou utilisation non autorisee est interdite.
      </Paragraph>

      <SectionTitle>7. Limitation de responsabilite</SectionTitle>
      <Paragraph>
        ZeroGaspy est un outil d'aide a la gestion alimentaire. Les informations fournies (dates de peremption, suggestions de recettes) sont indicatives et ne se substituent pas a votre jugement personnel concernant la qualite et la securite des aliments.
      </Paragraph>
      <Paragraph>
        Nous ne saurions etre tenus responsables des dommages directs ou indirects resultant de l'utilisation ou de l'impossibilite d'utiliser l'application.
      </Paragraph>

      <SectionTitle>8. Modification des CGU</SectionTitle>
      <Paragraph>
        Nous nous reservons le droit de modifier les presentes CGU a tout moment. Les utilisateurs seront informes des modifications importantes. La poursuite de l'utilisation de l'application apres modification vaut acceptation des nouvelles CGU.
      </Paragraph>

      <SectionTitle>9. Resiliation</SectionTitle>
      <Paragraph>
        Vous pouvez cesser d'utiliser l'application a tout moment et supprimer votre compte depuis les parametres. Nous nous reservons le droit de suspendre ou supprimer un compte en cas de violation des presentes CGU.
      </Paragraph>

      <SectionTitle>10. Droit applicable</SectionTitle>
      <Paragraph>
        Les presentes CGU sont soumises au droit francais. Tout litige relatif a leur interpretation ou leur execution sera soumis aux tribunaux francais competents.
      </Paragraph>

      <SectionTitle>11. Contact</SectionTitle>
      <Paragraph>
        Pour toute question concernant ces CGU, vous pouvez nous contacter via la fonction "Envoyer un feedback" de l'application.
      </Paragraph>
    </View>
  );

  const renderPrivacy = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('menu')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-2">
        Politique de Confidentialite
      </Text>
      <Text className="text-[#6A8A6E] text-sm mb-6">
        Derniere mise a jour : Janvier 2025
      </Text>

      <Paragraph>
        La protection de vos donnees personnelles est une priorite pour ZeroGaspy. Cette politique de confidentialite vous informe sur la maniere dont nous collectons, utilisons et protegeons vos informations.
      </Paragraph>

      <SectionTitle>1. Responsable du traitement</SectionTitle>
      <Paragraph>
        Le responsable du traitement des donnees personnelles est l'equipe ZeroGaspy. Pour toute question, utilisez la fonction "Envoyer un feedback" de l'application.
      </Paragraph>

      <SectionTitle>2. Donnees collectees</SectionTitle>
      <Paragraph>
        Nous collectons les donnees suivantes :
      </Paragraph>
      <BulletPoint>Donnees de compte : email, nom (si fourni), mot de passe (chiffre)</BulletPoint>
      <BulletPoint>Donnees d'inventaire : noms des aliments, dates de peremption, categories, quantites</BulletPoint>
      <BulletPoint>Donnees d'utilisation : statistiques de consommation, aliments jetes</BulletPoint>
      <BulletPoint>Donnees techniques : type d'appareil, version de l'application</BulletPoint>

      <SectionTitle>3. Finalites du traitement</SectionTitle>
      <Paragraph>
        Vos donnees sont utilisees pour :
      </Paragraph>
      <BulletPoint>Fournir les fonctionnalites de l'application</BulletPoint>
      <BulletPoint>Synchroniser vos donnees entre vos appareils</BulletPoint>
      <BulletPoint>Envoyer des notifications de rappel</BulletPoint>
      <BulletPoint>Ameliorer l'application et corriger les bugs</BulletPoint>
      <BulletPoint>Repondre a vos demandes de support</BulletPoint>

      <SectionTitle>4. Base legale</SectionTitle>
      <Paragraph>
        Le traitement de vos donnees repose sur :
      </Paragraph>
      <BulletPoint>L'execution du contrat (fourniture du service)</BulletPoint>
      <BulletPoint>Votre consentement (notifications, compte utilisateur)</BulletPoint>
      <BulletPoint>Notre interet legitime (amelioration du service, securite)</BulletPoint>

      <SectionTitle>5. Stockage et securite</SectionTitle>
      <Paragraph>
        Vos donnees sont stockees de maniere securisee :
      </Paragraph>
      <BulletPoint>Mode local : donnees chiffrees sur votre appareil uniquement</BulletPoint>
      <BulletPoint>Mode connecte : donnees hebergees sur Supabase (serveurs securises)</BulletPoint>
      <BulletPoint>Mots de passe : haches avec des algorithmes securises</BulletPoint>
      <BulletPoint>Communications : chiffrees via HTTPS/TLS</BulletPoint>

      <SectionTitle>6. Partage des donnees</SectionTitle>
      <Paragraph>
        Nous ne vendons jamais vos donnees personnelles. Vos donnees peuvent etre partagees avec :
      </Paragraph>
      <BulletPoint>Supabase : hebergement et authentification</BulletPoint>
      <BulletPoint>Expo : infrastructure de l'application</BulletPoint>
      <Paragraph>
        Ces prestataires sont soumis a des obligations de confidentialite strictes.
      </Paragraph>

      <SectionTitle>7. Duree de conservation</SectionTitle>
      <Paragraph>
        Vos donnees sont conservees tant que votre compte est actif. Apres suppression de votre compte, vos donnees sont effacees dans un delai de 30 jours, sauf obligation legale de conservation.
      </Paragraph>

      <SectionTitle>8. Vos droits</SectionTitle>
      <Paragraph>
        Conformement au RGPD, vous disposez des droits suivants :
      </Paragraph>
      <BulletPoint>Droit d'acces : obtenir une copie de vos donnees</BulletPoint>
      <BulletPoint>Droit de rectification : corriger vos donnees</BulletPoint>
      <BulletPoint>Droit a l'effacement : supprimer votre compte et donnees</BulletPoint>
      <BulletPoint>Droit a la portabilite : exporter vos donnees (JSON/CSV)</BulletPoint>
      <BulletPoint>Droit d'opposition : vous opposer a certains traitements</BulletPoint>
      <BulletPoint>Droit de retrait du consentement : a tout moment</BulletPoint>
      <Paragraph>
        Pour exercer ces droits, utilisez les parametres de l'application ou contactez-nous via le feedback.
      </Paragraph>

      <SectionTitle>9. Cookies et traceurs</SectionTitle>
      <Paragraph>
        L'application mobile n'utilise pas de cookies. Nous utilisons uniquement le stockage local necessaire au fonctionnement de l'application.
      </Paragraph>

      <SectionTitle>10. Mineurs</SectionTitle>
      <Paragraph>
        L'application n'est pas destinee aux enfants de moins de 13 ans. Si vous etes parent et decouvrez que votre enfant nous a fourni des donnees personnelles, contactez-nous pour les supprimer.
      </Paragraph>

      <SectionTitle>11. Modifications</SectionTitle>
      <Paragraph>
        Cette politique peut etre mise a jour. En cas de modification importante, nous vous en informerons via l'application. La date de derniere mise a jour est indiquee en haut de ce document.
      </Paragraph>

      <SectionTitle>12. Contact et reclamations</SectionTitle>
      <Paragraph>
        Pour toute question ou reclamation concernant vos donnees personnelles, contactez-nous via la fonction feedback. Vous avez egalement le droit d'introduire une reclamation aupres de la CNIL (www.cnil.fr).
      </Paragraph>
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'cgu':
        return renderCGU();
      case 'privacy':
        return renderPrivacy();
      default:
        return renderMenu();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2 border-b border-[#3C6E47]/10">
          <View className="w-10" />
          <View className="w-10 h-1 bg-[#3C6E47]/20 rounded-full" />
          <TouchableOpacity onPress={handleClose} className="w-10 items-end">
            <Ionicons name="close" size={24} color="#3C6E47" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

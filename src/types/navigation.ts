export type RootStackParamList = {
  FirstChoice: undefined;
  FamilyHome: undefined;
  SeniorHome: undefined;
  Chat: {
    participantId: string;
    participantName: string;
    isVirtual?: boolean;
  };
  ContactDetail: {
    familyId: string;
    seniorId: string;
  };
  // Ajouter d'autres écrans au besoin
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
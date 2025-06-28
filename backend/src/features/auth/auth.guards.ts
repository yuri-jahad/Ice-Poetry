export const authGuard = {
  beforeHandle: ({ isAuthenticated, set }: any) => {
    if (!isAuthenticated) {
      set.status = 401
      return {
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      }
    }
  }
}

export const adminGuard = {
  beforeHandle: ({ user, set }: any) => {
    if (!user || user.role !== 'Administrator') {
      set.status = 403 // 403 Forbidden (déjà authentifié mais pas autorisé)
      return {
        error: 'Accès refusé',
        message: "Vous n'avez pas les privilèges administrateur nécessaires"
      }
    }
  }
}


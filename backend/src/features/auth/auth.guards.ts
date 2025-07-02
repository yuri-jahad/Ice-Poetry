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

export const demoGuard = {
  beforeHandle: ({ user, set, request }: any) => {
    if (request.method === 'GET') {
      return
    }

    if (user.username === 'Demo') {
      set.status = 403
      return {
        error: 'Accès refusé',
        message: 'Inaccessible uniquement pour le compte demo'
      }
    }
  }
}

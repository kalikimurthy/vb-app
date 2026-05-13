import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return auth.me().pipe(
    map((user) => {
      if (user) {
        return true;
      }

      return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
    })
  );
};

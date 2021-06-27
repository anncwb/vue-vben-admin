import type { Router, RouteRecordRaw } from 'vue-router';

import { usePermissionStoreWidthOut } from '/@/store/modules/permission';

import { PageEnum } from '/@/enums/pageEnum';
import { useUserStoreWidthOut } from '/@/store/modules/user';

import { PAGE_NOT_FOUND_ROUTE } from '/@/router/routes/basic';

const LOGIN_PATH = PageEnum.BASE_LOGIN;

const whitePathList: PageEnum[] = [LOGIN_PATH];

export function createPermissionGuard(router: Router) {
  const userStore = useUserStoreWidthOut();
  const permissionStore = usePermissionStoreWidthOut();
  router.beforeEach(async (to, from, next) => {
    // Jump to the 404 page after processing the login
    if (from.path === LOGIN_PATH && to.name === PAGE_NOT_FOUND_ROUTE.name) {
      next(PageEnum.BASE_HOME);
      return;
    }

    // Whitelist can be directly entered
    if (whitePathList.includes(to.path as PageEnum)) {
      next();
      return;
    }

    const token = userStore.getToken;

    // token does not exist
    if (!token) {
      // You can access without permission. You need to set the routing meta.ignoreAuth to true
      if (
        to.meta.ignoreAuth
        // || to.name === FULL_PAGE_NOT_FOUND_ROUTE.name
      ) {
        next();
        return;
      }
      // redirect login page
      const redirectData: { path: string; replace: boolean; query?: Recordable<string> } = {
        path: LOGIN_PATH,
        replace: true,
      };
      if (to.path) {
        redirectData.query = {
          ...redirectData.query,
          redirect: to.path,
        };
      }
      next(redirectData);
      return;
    }
    // 无论是哪种权限，刷新页面时都重新获取用户信息
    if (userStore.getLastUpdateTime === 0) {
      await userStore.getUserInfoAction();
    }
    if (permissionStore.getIsDynamicAddedRoute) {
      next();
      return;
    }
    const routes = await permissionStore.buildRoutesAction();

    routes.forEach((route) => {
      router.addRoute(route as unknown as RouteRecordRaw);
    });

    const redirectPath = (from.query.redirect || to.path) as string;
    const redirect = decodeURIComponent(redirectPath);
    const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect };
    permissionStore.setDynamicAddedRoute(true);
    next(nextData);
  });
}

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { routing, locales, type Locale } from './i18n/routing';
import { DEFAULT_USER_TIME_ZONE } from './lib/user-time-zone';
import { editionMessages } from './lib/edition/current/messages';

// Re-export for convenience
export { locales, type Locale, routing };
export const defaultLocale = routing.defaultLocale;

export default getRequestConfig(async ({ requestLocale }) => {
    // 获取请求的 locale
    const locale = await requestLocale;

    // 验证传入的 locale 是否有效
    if (!locale || !locales.includes(locale as Locale)) {
        notFound();
    }

    // 加载所有模块化的翻译文件
    const [
        common,
        assetLibrary,
        nav,
        apiConfig,
        landing,
        auth,
        workspace,
        workspaceDetail,
        profile,
        apiTypes,
        video,
        assets,
        errors,
        projectWorkflow,
        configModal,
        progress,
        scriptView,
        assetHub,
        assetModal,
        assetPicker,
        layout,
        home,
        assistantAgent,
        legal,
        selectedEditionMessages
    ] = await Promise.all([
        import(`../messages/${locale}/common.json`),
        import(`../messages/${locale}/assetLibrary.json`),
        import(`../messages/${locale}/nav.json`),
        import(`../messages/${locale}/apiConfig.json`),
        import(`../messages/${locale}/landing.json`),
        import(`../messages/${locale}/auth.json`),
        import(`../messages/${locale}/workspace.json`),
        import(`../messages/${locale}/workspaceDetail.json`),
        import(`../messages/${locale}/profile.json`),
        import(`../messages/${locale}/apiTypes.json`),
        import(`../messages/${locale}/video.json`),
        import(`../messages/${locale}/assets.json`),
        import(`../messages/${locale}/errors.json`),
        import(`../messages/${locale}/project-workflow.json`),
        import(`../messages/${locale}/configModal.json`),
        import(`../messages/${locale}/progress.json`),
        import(`../messages/${locale}/scriptView.json`),
        import(`../messages/${locale}/assetHub.json`),
        import(`../messages/${locale}/assetModal.json`),
        import(`../messages/${locale}/assetPicker.json`),
        import(`../messages/${locale}/layout.json`),
        import(`../messages/${locale}/home.json`),
        import(`../messages/${locale}/assistantAgent.json`),
        import(`../messages/${locale}/legal.json`),
        editionMessages.load(locale as Locale)
    ]);

    return {
        locale,
        // Never inherit the deployment container's UTC zone as a user-facing
        // default. Client billing Views refine this with the browser IANA zone.
        timeZone: DEFAULT_USER_TIME_ZONE,
        messages: {
            common: common.default,
            assetLibrary: assetLibrary.default,
            nav: nav.default,
            apiConfig: apiConfig.default,
            landing: landing.default,
            auth: auth.default,
            workspace: workspace.default,
            workspaceDetail: workspaceDetail.default,
            profile: profile.default,
            apiTypes: apiTypes.default,
            video: video.default,
            assets: assets.default,
            errors: errors.default,
            projectWorkflow: projectWorkflow.default,
            configModal: configModal.default,
            progress: progress.default,
            scriptView: scriptView.default,
            assetHub: assetHub.default,
            assetModal: assetModal.default,
            assetPicker: assetPicker.default,
            layout: layout.default,
            home: home.default,
            assistantAgent: assistantAgent.default,
            legal: legal.default,
            ...selectedEditionMessages
        }
    };
});

import Editor, { TABS, TOOLS } from 'react-filerobot-image-editor';
import { FS, splitPath } from '../utils';
import { createRoot } from 'react-dom/client';
import React from 'react';

const MAP = {
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'webp': 'webp'
};

export function mount(div, file, ev) {
    const finfo = splitPath(file);
    createRoot(div).render(<Editor
        source={file.url}
        onSave={async function (obj) {
            if (!obj.imageCanvas) return;
            const mime = 'image/' + MAP[finfo.ext];
            const blob = await new Promise(rs => obj.imageCanvas.toBlob(rs, mime, 1));
            FS.write(file.path, blob);
        }}
        onClose={() => ev('close')}
        annotationsCommon={{
            fill: '#ff0000',
        }}
        Text={{ text: 'Filerobot...' }}
        Rotate={{ angle: 90, componentType: 'slider' }}
        Crop={{
            presetsItems: [
                {
                    titleKey: 'classicTv',
                    descriptionKey: '4:3',
                    ratio: 4 / 3,
                    // icon: CropClassicTv, // optional, CropClassicTv is a React Function component. Possible (React Function component, string or HTML Element)
                },
                {
                    titleKey: 'cinemascope',
                    descriptionKey: '21:9',
                    ratio: 21 / 9,
                    // icon: CropCinemaScope, // optional, CropCinemaScope is a React Function component.  Possible (React Function component, string or HTML Element)
                },
            ],
            presetsFolders: [
                {
                    titleKey: 'socialMedia', // will be translated into Social Media as backend contains this translation key
                    // icon: Social, // optional, Social is a React Function component. Possible (React Function component, string or HTML Element)
                    groups: [
                        {
                            titleKey: 'facebook',
                            items: [
                                {
                                    titleKey: 'profile',
                                    width: 180,
                                    height: 180,
                                    descriptionKey: 'fbProfileSize',
                                },
                                {
                                    titleKey: 'coverPhoto',
                                    width: 820,
                                    height: 312,
                                    descriptionKey: 'fbCoverPhotoSize',
                                },
                            ],
                        },
                    ],
                },
            ],
        }}
        tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS, TABS.FINETUNE]}
        defaultTabId={TABS.ANNOTATE}
        defaultToolId={TOOLS.TEXT}
        savingPixelRatio={1}
        previewPixelRatio={1}
    ></Editor>);
}
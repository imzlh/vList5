export interface mkvFile{
    type: 'ass' | 'srt',
    id: number,
    data: string
}

export const extract = (file: string) => Promise<Array<mkvFile>>;
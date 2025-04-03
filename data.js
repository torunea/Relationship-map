// データ処理関数
function processData(externalData = null) {
    // 外部データがある場合はそれを使用、なければデフォルトデータ
    const DATA = externalData || {
    people: [
        { id: 1, name: '田中太郎', category: '建築家', tags: '近代建築論,日本の住宅' },
        { id: 2, name: '佐藤花子', category: '写真家', tags: '風景写真,自然' },
        { id: 3, name: '鈴木一郎', category: '建築家', tags: '都市計画,公共空間' },
        { id: 4, name: '山田健太', category: 'エンジニア', tags: 'AIシステム,機械学習' },
        { id: 5, name: '高橋恵子', category: 'デザイナー', tags: 'インターフェース,UX' },
        { id: 6, name: '渡辺誠', category: '写真家', tags: '自然写真,環境' },
        { id: 7, name: '伊藤直子', category: 'エンジニア', tags: 'オープンソース,アルゴリズム' },
        { id: 8, name: '小林健一', category: 'デザイナー', tags: '広告,ブランディング' },
        { id: 9, name: '中村拓也', category: '建築家', tags: '環境建築,持続可能性' },
        { id: 10, name: '加藤美咲', category: '写真家', tags: 'ポートレート,光の表現' },
    ],
    works: [
        { id: 1, name: '近代建築論', type: '論考', year: 2015, tags: '建築家,理論', description: '田中太郎による現代建築の考察' },
        { id: 2, name: '日本の自然風景', type: '書籍', year: 2018, tags: '写真家,自然', description: '佐藤花子と渡辺誠が撮影した風景写真集' },
        { id: 3, name: '都市と人間', type: '論考', year: 2020, tags: '建築家,都市計画', description: '鈴木一郎が都市空間について論じた評論' },
        { id: 4, name: 'AIの倫理', type: '書籍', year: 2022, tags: 'エンジニア,技術論', description: '山田健太と伊藤直子による技術と社会の関係性についての考察' },
        { id: 5, name: '現代デザイン史', type: '書籍', year: 2016, tags: 'デザイナー,歴史', description: '高橋恵子が編纂した現代デザインの歴史書' },
        { id: 6, name: '光と影の表現', type: '論考', year: 2019, tags: '写真家,技法', description: '加藤美咲による写真表現の技法についての論考' },
    ],
    organizations: [
        { id: 1, name: '日本建築協会', type: '組織', year: 2010, tags: '建築家,専門団体', description: '中村拓也が理事を務める建築家の専門組織' },
        { id: 2, name: 'デジタルデザイン研究所', type: '組織', year: 2017, tags: 'デザイナー,研究', description: '高橋恵子と小林健一が所属するデザイン研究機関' },
        { id: 3, name: '写真芸術学会', type: '組織', year: 2014, tags: '写真家,学術', description: '佐藤花子が会長を務める写真の学術団体' }
    ]
    };

    // タグを配列に変換する関数
    function parseTags(tagString) {
    return tagString.split(',').map(tag => tag.trim());
    }

    const nodes = [];
    const links = [];
    const categories = new Set();
    const years = new Set();
    
    // 人物ノード
    DATA.people.forEach(person => {
    const personTags = parseTags(person.tags);
    
    // 人物カテゴリを収集
    categories.add(person.category);
    
    // 人物ノードを追加
    nodes.push({
        id: `person-${person.id}`,
        name: person.name,
        type: '人物',
        category: person.category,
        tags: personTags,
        radius: 35,
        color: '#4299E1'
    });
    });
    
    // 論考・書籍ノード
    DATA.works.forEach(work => {
    const workTags = parseTags(work.tags);
    
    // 年情報を収集
    if (work.year) {
        years.add(work.year);
    }
    
    nodes.push({
        id: `work-${work.id}`,
        name: work.name,
        type: work.type,
        year: work.year,
        tags: workTags,
        description: work.description || '',
        radius: 40,
        color: work.type === '論考' ? '#F6AD55' : '#F687B3' // 論考はオレンジ、書籍はピンク
    });
    });
    
    // 組織ノード
    DATA.organizations.forEach(org => {
    const orgTags = parseTags(org.tags);
    
    // 年情報を収集
    if (org.year) {
        years.add(org.year);
    }
    
    nodes.push({
        id: `org-${org.id}`,
        name: org.name,
        type: '組織',
        year: org.year,
        tags: orgTags,
        description: org.description || '',
        radius: 45,
        color: '#805AD5'
    });
    });
    
    // 1. 人物と組織の紐付け - 説明文の直接言及のみ
    DATA.organizations.forEach(org => {
    // 組織の説明文に人物の名前が含まれるかチェック
    if (org.description) {
        DATA.people.forEach(person => {
        if (org.description.includes(person.name)) {
            links.push({
            source: `person-${person.id}`,
            target: `org-${org.id}`,
            value: 3,
            type: '説明文関連'
            });
        }
        });
    }
    });
    
    // 2. 人物と論考・書籍の紐付け - 説明文の直接言及のみ
    DATA.works.forEach(work => {
    // 論考・書籍の説明文に人物の名前が含まれるかチェック
    if (work.description) {
        DATA.people.forEach(person => {
        if (work.description.includes(person.name)) {
            links.push({
            source: `person-${person.id}`,
            target: `work-${work.id}`,
            value: 3,
            type: '説明文関連'
            });
        }
        });
    }
    });
    
    // ソートした年のリスト
    const sortedYears = Array.from(years).sort((a, b) => a - b);

    return {
        nodes,
        links,
        categories: Array.from(categories),
        years: sortedYears,
        timelineHeight: sortedYears.length > 1 
        ? (sortedYears[sortedYears.length - 1] - sortedYears[0]) * 100 + 200 // 100px/年 + 余白
        : 600
    };
}

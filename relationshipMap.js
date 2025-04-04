// リレーションシップマップクラス
class RelationshipMap {
    constructor() {
    // DOM要素
    this.svg = d3.select('#relationship-map');
    this.container = null;
    this.searchInput = document.getElementById('search-input');
    this.searchModeSelect = document.getElementById('search-mode');
    this.categoryFiltersEl = document.getElementById('category-filters');
    this.zoomInButton = document.getElementById('zoom-in');
    this.zoomOutButton = document.getElementById('zoom-out');
    this.zoomResetButton = document.getElementById('zoom-reset');
    this.zoomLevelEl = document.getElementById('zoom-level');
    this.hoverInfoEl = document.getElementById('hover-info');
    this.personDetailEl = document.getElementById('person-detail');
    this.nodeDetailEl = document.getElementById('node-detail');
    this.loadingIndicator = document.getElementById('loading-indicator');
    
    // 状態
    this.nodes = [];
    this.links = [];
    this.categories = [];
    this.years = [];
    this.timelineHeight = 600;
    this.selectedCategories = {};
    this.searchFilter = '';
    this.searchMode = 'OR';
    this.filteredNodes = [];
    this.filteredLinks = [];
    this.hoveredNode = null;
    this.selectedNode = null;
    this.zoomLevel = 1;
    this.simulation = null;
    this.zoom = null;
    
    // ウィンドウサイズ
    this.dimensions = {
        width: window.innerWidth - 40,
        height: window.innerHeight - 100
    };
    
    // 初期化
    this.initializeEventListeners();
    this.loadData();
    }
    
    // データ読み込み
    async loadData() {
        this.showLoading();
        
        try {
            if (CONFIG.useDefaultData) {
                // デフォルトデータを使用
                const processedData = processData();
                this.setData(processedData);
            } else {
                // ウェブに公開されたGoogleスプレッドシートからデータ読み込み
                dataLoader.initialize(CONFIG.spreadsheet.id);
                const data = await dataLoader.loadFromSpreadsheet();
                
                if (data && data.people && data.people.length > 0) {
                    const processedData = processData(data);
                    this.setData(processedData);
                } else {
                    console.warn('スプレッドシートからのデータが空か不完全です。デフォルトデータを使用します。');
                    const processedData = processData();
                    this.setData(processedData);
                }
            }
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            this.showError('データの読み込みに失敗しました。デフォルトデータを使用します。');
            // エラー時もデフォルトデータを使用
            const processedData = processData();
            this.setData(processedData);
        } finally {
            this.hideLoading();
        }
    }
    
    // データをセット
    setData(processedData) {
    this.nodes = processedData.nodes;
    this.links = processedData.links;
    this.categories = processedData.categories;
    this.years = processedData.years;
    this.timelineHeight = processedData.timelineHeight;
    
    // カテゴリフィルタ初期化
    this.categories.forEach(category => {
        this.selectedCategories[category] = true;
    });
    
    this.renderCategoryFilters();
    this.updateMapSize();
    this.render();
    }
    
    // ローディング表示
    showLoading() {
    if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'flex';
    }
    }
    
    // ローディング非表示
    hideLoading() {
    if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'none';
    }
    }
    
    // エラー表示
    showError(message) {
    alert(message);
    }
    
    // イベントリスナー初期化
    initializeEventListeners() {
        // 検索入力
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.searchFilter = this.searchInput.value;
                this.render();
            });
        }
        
        // 検索モード変更
        if (this.searchModeSelect) {
            this.searchModeSelect.addEventListener('change', () => {
                this.searchMode = this.searchModeSelect.value;
                this.render();
            });
        }
        
        // リセットボタン
        if (this.resetFilterButton = document.getElementById('reset-filter')) {
            this.resetFilterButton.addEventListener('click', this.resetFilters.bind(this));
        }
        
        // ズームコントロール
        if (this.zoomInButton) {
            this.zoomInButton.addEventListener('click', this.handleZoomIn.bind(this));
        }
        
        if (this.zoomOutButton) {
            this.zoomOutButton.addEventListener('click', this.handleZoomOut.bind(this));
        }
        
        if (this.zoomResetButton) {
            this.zoomResetButton.addEventListener('click', this.handleZoomReset.bind(this));
        }
        
        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            this.updateMapSize();
            this.render();
        });
        
        // SVGのマウスホイールイベント処理
        if (this.svg && this.svg.node()) {
            this.svg.node().addEventListener('wheel', (event) => {
                event.preventDefault();
                
                // 現在の変形を取得
                const currentTransform = d3.zoomTransform(this.svg.node());
                
                // 縦方向のスクロール量
                const scrollAmount = event.deltaY * 0.5;
                
                // 新しい変形を計算（X座標は維持、Y座標のみ変更）
                const newTransform = d3.zoomIdentity
                    .translate(currentTransform.x, currentTransform.y - scrollAmount)
                    .scale(currentTransform.k);
                
                // 変形を適用
                this.container.attr("transform", newTransform);
                
                // ズーム状態を更新
                this.svg.property("__zoom", newTransform);
            }, { passive: false });
        }
    }
    
    // フィルターをリセット
    resetFilters() {
        // 現在のズーム状態を保存
        const currentTransform = d3.zoomTransform(this.svg.node());
        
        // 検索フィルターをクリア
        this.searchInput.value = '';
        this.searchFilter = '';
        
        // カテゴリフィルターをすべて選択状態に
        this.categories.forEach(category => {
            this.selectedCategories[category] = true;
        });
        
        // カテゴリフィルターUI更新
        this.renderCategoryFilters();
        
        // 再描画
        this.render();
        
        // 描画後に保存したズーム状態を復元
        setTimeout(() => {
            this.svg.call(
                this.zoom.transform,
                currentTransform
            );
        }, 10);
    }
    
    // カテゴリフィルター描画
    renderCategoryFilters() {
    this.categoryFiltersEl.innerHTML = '';
    
    this.categories.forEach(category => {
        const label = document.createElement('label');
        label.className = 'category-filter-item';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this.selectedCategories[category] || false;
        input.addEventListener('change', () => {
        this.selectedCategories[category] = !this.selectedCategories[category];
        this.render();
        });
        
        const span = document.createElement('span');
        span.textContent = category;
        
        label.appendChild(input);
        label.appendChild(span);
        this.categoryFiltersEl.appendChild(label);
    });
    }
    
    // マップサイズ更新
    updateMapSize() {
    this.dimensions = {
        width: window.innerWidth - 40,
        height: window.innerHeight - 100
    };
    
    this.svg
        .attr('width', this.dimensions.width)
        .attr('height', Math.max(this.dimensions.height, this.timelineHeight));
    }
    
    // ノードフィルタリング
    filterNodes() {
        // 1. カテゴリによるフィルタリング
        let filteredNodes = this.nodes.filter(node => {
            if (node.type === '人物') {
            return this.selectedCategories[node.category];
            }
            return true; // 人物以外はそのまま表示
        });
        
        // 2. 検索語によるフィルタリング
        if (this.searchFilter) {
            // 複数のキーワードを分割
            const keywords = this.searchFilter.toLowerCase().split(/\s+/).filter(k => k.length > 0);
            
            if (keywords.length > 0) {
            // 名前やタグに検索語が含まれるノードを見つける
            const matchingNodeIds = new Set();
            
            filteredNodes.forEach(node => {
                // 検索対象のテキスト
                const searchTexts = [
                node.name.toLowerCase(),
                ...(node.tags ? node.tags.map(tag => tag.toLowerCase()) : []),
                node.description ? node.description.toLowerCase() : ''
                ];
                
                let isMatch = false;
                
                if (this.searchMode === 'OR') {
                // ORモード: いずれかのキーワードが含まれていればマッチ
                isMatch = keywords.some(keyword => 
                    searchTexts.some(text => text.includes(keyword))
                );
                } else {
                // ANDモード: すべてのキーワードが含まれていればマッチ
                isMatch = keywords.every(keyword => 
                    searchTexts.some(text => text.includes(keyword))
                );
                }
                
                if (isMatch) {
                matchingNodeIds.add(node.id);
                }
            });
            
            // 検索にマッチしないノードを除外
            if (matchingNodeIds.size > 0) {
                filteredNodes = filteredNodes.filter(node => matchingNodeIds.has(node.id));
            }
            }
        }
        
        // 3. フィルターされたノードに接続されている他のノードを取得
        const nodeIdsToInclude = new Set(filteredNodes.map(node => node.id));
        const additionalNodeIds = new Set();
        
        // リンクを確認して、フィルタリングされたノードに接続されている他のノードを取得
        this.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            if (nodeIdsToInclude.has(sourceId) && !nodeIdsToInclude.has(targetId)) {
            // ターゲットが人物であるか確認し、カテゴリフィルタをチェック
            const targetNode = this.nodes.find(n => n.id === targetId);
            if (targetNode && (targetNode.type !== '人物' || this.selectedCategories[targetNode.category])) {
                additionalNodeIds.add(targetId);
            }
            } else if (nodeIdsToInclude.has(targetId) && !nodeIdsToInclude.has(sourceId)) {
            // ソースが人物であるか確認し、カテゴリフィルタをチェック
            const sourceNode = this.nodes.find(n => n.id === sourceId);
            if (sourceNode && (sourceNode.type !== '人物' || this.selectedCategories[sourceNode.category])) {
                additionalNodeIds.add(sourceId);
            }
            }
        });
        
        // 追加ノードを含めた最終的なノードリスト
        additionalNodeIds.forEach(id => {
            if (!nodeIdsToInclude.has(id)) {
            const nodeToAdd = this.nodes.find(n => n.id === id);
            if (nodeToAdd) {
                filteredNodes.push(nodeToAdd);
                nodeIdsToInclude.add(id);
            }
            }
        });
        
        // リンクをフィルタリング
        const filteredLinks = this.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            return nodeIdsToInclude.has(sourceId) && nodeIdsToInclude.has(targetId);
        });
        
        this.filteredNodes = filteredNodes;
        this.filteredLinks = filteredLinks;
        
        // フィルターが適用されているかを判断
        const isFiltered = this.searchFilter !== '';
        
        // タイムラインの表示/非表示を設定
        this.showTimeline = !isFiltered;
    }
    
    // タイムラインスケール作成
    createTimelineScale() {
    // タイムラインの開始と終了を取得
    const minYear = this.years[0];
    const maxYear = this.years[this.years.length - 1];
    
    return d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([100, this.timelineHeight - 100]); // 上下のマージン
    }
    
    // マップ描画
    render() {
        // ノードをフィルタリング
        this.filterNodes();
        
        // SVGをクリア
        this.svg.selectAll("*").remove();
        
        // コンテナ作成
        this.container = this.svg.append("g");
        
        // タイムラインスケール
        const timelineScale = this.createTimelineScale();
        
        // 安全チェック - years配列が空でないか確認
        if (!this.years || this.years.length === 0) {
            console.warn("年データが不足しています。タイムラインはスキップされます。");
            // 最小限のセットアップで続行
            this.setupZoomSimple();
            this.renderNodesAndLinks(null);
            return;
        }
        
        // ズーム機能
        this.setupZoom(timelineScale);
        
        // タイムライン描画
        this.renderTimeline(timelineScale);
        
        // ノードとリンク描画
        this.renderNodesAndLinks(timelineScale);
        
        // 最後にズーム状態を保存
        this.saveCurrentTransform();
    }

    // 簡素化されたズームセットアップ（年データがない場合用）
    setupZoomSimple() {
        this.zoom = d3.zoom()
            .scaleExtent([0.3, 2])
            .on("zoom", (event) => {
                this.zoomLevel = event.transform.k;
                this.zoomLevelEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
                this.container.attr("transform", event.transform);
            });
            
        this.svg.call(this.zoom);
        
        // シンプルな中央配置
        const centerX = this.dimensions.width / 2;
        const centerY = this.dimensions.height / 2;
        const initialScale = 0.8;
        
        this.svg.call(
            this.zoom.transform,
            d3.zoomIdentity.translate(centerX, centerY).scale(initialScale)
        );
        
        this.zoomLevel = initialScale;
        this.zoomLevelEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
        
    // ズーム機能セットアップ
    // 初期表示位置を中央に調整
    setupZoom(timelineScale) {
        // ズームとパン機能を追加
        this.zoom = d3.zoom()
            .scaleExtent([0.3, 2])
            .on("zoom", (event) => {
                // ズームレベルを10%刻みに丸める
                const rawScale = event.transform.k;
                const roundedScale = Math.round(rawScale * 10) / 10;
                
                // ズームレベルを保存
                this.zoomLevel = roundedScale;
                this.zoomLevelEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
                
                // コンテナの変形を適用
                this.container.attr("transform", event.transform);
            })
            // ホイールイベントのカスタム処理
            .filter(event => {
                // ホイール以外のイベントはそのまま処理
                if (event.type !== 'wheel') return true;

                // ホイールイベントの場合は特別な処理
                event.preventDefault();
                
                // 現在の変形を取得
                const currentTransform = d3.zoomTransform(this.svg.node());
                
                // 縦方向のスクロール量
                const scrollAmount = event.deltaY * 0.5;
                
                // X方向は維持し、Y方向のみ変更した新しい変形を設定
                const newTransform = d3.zoomIdentity
                    .translate(currentTransform.x, currentTransform.y - scrollAmount)
                    .scale(currentTransform.k);
                
                // 新しい変形を適用
                this.container.attr("transform", newTransform);
                
                // ズーム状態を更新
                this.svg.property("__zoom", newTransform);
                
                // デフォルトのズーム動作をキャンセル
                return false;
            });
        
        // SVGにズーム動作を適用
        this.svg.call(this.zoom);
        
        // 以前の変換状態があれば再利用、なければ初期位置を設定
        if (this._savedTransform) {
            this.svg.call(
                this.zoom.transform,
                this._savedTransform
            );
        } else {
            // 初期表示位置
            const initialScale = 0.8;
            const centerX = this.dimensions.width / 2;
            
            // NaNを防止するため、yearsが存在するか確認
            let centerY = this.dimensions.height / 2;
            if (this.years && this.years.length > 0) {
                const timelineCenter = (timelineScale(this.years[this.years.length - 1]) + timelineScale(this.years[0])) / 2;
                centerY = this.dimensions.height / 2 - timelineCenter / 2;
            }
            
            // NaNチェック
            if (isNaN(centerY)) {
                centerY = this.dimensions.height / 2;
            }
            
            this.svg.call(
                this.zoom.transform,
                d3.zoomIdentity.translate(centerX, centerY).scale(initialScale)
            );
            
            this.zoomLevel = initialScale;
            this.zoomLevelEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }
    
    // タイムライン描画
    renderTimeline(timelineScale) {
        // フィルター適用時は表示しない
        if (this.showTimeline === false) return;
        
        const timelineGroup = this.container.append("g")
            .attr("class", "timeline")
            .attr("transform", "translate(-200, 0)"); // ここで左に200px移動
        
        // タイムラインの開始と終了を取得
        const minYear = this.years[0];
        const maxYear = this.years[this.years.length - 1];
        
        // タイムラインの軸を描画
        timelineGroup.append("line")
            .attr("x1", 0)
            .attr("y1", timelineScale(minYear))
            .attr("x2", 0)
            .attr("y2", timelineScale(maxYear))
            .attr("stroke", "#CBD5E0")
            .attr("stroke-width", 2);
        
        // 年のマークと数字、横線を描画
        this.years.forEach(year => {
            const yearGroup = timelineGroup.append("g")
            .attr("transform", `translate(0, ${timelineScale(year)})`);
            
            // 年のマーク
            yearGroup.append("line")
            .attr("x1", -5)
            .attr("y1", 0)
            .attr("x2", 100) // 右側に長い線を描画
            .attr("y2", 0)
            .attr("stroke", "#A0AEC0")
            .attr("stroke-width", 1);
            
            // 年表示
            yearGroup.append("text")
            .attr("x", -15)
            .attr("y", 4)
            .attr("text-anchor", "end")
            .attr("font-size", "15px")
            .attr("fill", "#4A5568")
            .text(year);
            
            // 横方向の薄い線
            yearGroup.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", this.dimensions.width)
            .attr("y2", 0)
            .attr("stroke", "#EDF2F7")
            .attr("stroke-width", 0.5)
            .attr("stroke-dasharray", "2,2");
        });
    }
    
    // ノードとリンク描画
    // ノードとリンク描画メソッドも修正
    renderNodesAndLinks(timelineScale) {
        // シミュレーション設定
        const minYear = this.years && this.years.length > 0 ? this.years[0] : 2000;
        const maxYear = this.years && this.years.length > 0 ? this.years[this.years.length - 1] : 2023;
        
        // timelineScaleがnullの場合の代替関数を提供
        const getYPosition = (year) => {
            if (!timelineScale) {
                // timelineScaleがない場合はデフォルト位置を返す
                return this.dimensions.height / 2;
            }
            return timelineScale(year);
        };
    
        this.simulation = d3.forceSimulation(this.filteredNodes)
            .force("link", d3.forceLink(this.filteredLinks).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-300))

            // シミュレーション設定の衝突検出部分
            .force("collision", d3.forceCollide().radius(d => {
                // 人物ノードとそれ以外で半径を変える
                if (d.type === '人物') {
                    return 50; // 衝突半径を大きくする (45 + マージン)
                } else {
                    return 70; // 四角形の対角線の半分くらいの値
                }
            }))
        
        .force("x", d3.forceX().x(d => {
            // 人物以外のノードを中心近くに、人物ノードを左右に分散
            if (d.type !== '人物') {
                return 0; // 人物以外のノードを中心に
            } else {
                // 人物ノードの場合、関連ノードから少し離れた位置に配置
                const relatedNodes = this.filteredLinks
                    .filter(link => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        return sourceId === d.id || targetId === d.id;
                    });
                
                // 関連ノードの平均X座標から少し離す
                if (relatedNodes.length > 0) {
                    // 索引をもとに左右に分散（奇数インデックスは左、偶数インデックスは右に）
                    const index = this.filteredNodes.findIndex(n => n.id === d.id);
                    return index % 2 === 0 ? -200 : 200;
                } else {
                    // 関連がない場合はランダムに左右に分散
                    return Math.random() > 0.5 ? -400 : 400;
                }
            }
        }).strength(0.4)) // 強めの力で引き寄せる

        .force("y", d3.forceY().y(d => {
            // 人物ノードはY軸方向に均等に分散、それ以外は年に基づいて配置
            if (d.type === '人物') {
                // 人物の場合は関連するノードの平均位置に近づける
                const relatedNodes = this.filteredLinks
                .filter(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    return sourceId === d.id || targetId === d.id;
                })
                .map(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const otherId = sourceId === d.id ? targetId : sourceId;
                    const otherNode = this.filteredNodes.find(n => n.id === otherId);
                    return otherNode && otherNode.year ? timelineScale(otherNode.year) : null;
                })
                .filter(y => y !== null);
                
                if (relatedNodes.length > 0) {
                // 関連ノードの平均Y座標を使用
                const avgY = relatedNodes.reduce((a, b) => a + b, 0) / relatedNodes.length;
                return isNaN(avgY) ? this.dimensions.height / 2 : avgY;
            } else {
                // 関連がない場合は中央に配置
                return this.dimensions.height / 2;
            }
        } else if (d.year) {
            // 年情報がある場合
            const y = getYPosition(d.year);
            return isNaN(y) ? this.dimensions.height / 2 : y;
        } else {
            // 年情報がない場合
            return this.dimensions.height / 2;
        }
    }).strength(d => d.year ? 0.8 : 0.2)) // 年情報があるノードはより強く引き寄せる
    
    // リンク描画
    const link = this.container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(this.filteredLinks)
        .enter().append("line")
        .attr("stroke", d => {
            // リンクタイプに基づいて色を設定
            if (d.type === '組織関連') {
                return "#4A90E2"; // 青色 - 組織関連
            } else {
                return "#E53E3E"; // 赤色 - 説明文関連（人物関連）
            }
        })
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", 1.5);
    
    // ノード描画
    const node = this.container.append("g")
    .attr("class", "nodes")
    .selectAll(".node")
    .data(this.filteredNodes)
    .enter().append("g")
    .attr("class", "node")
    .on("mouseover", (event, d) => {
    // 人物ノードのみホバー時に詳細表示
    if (d.type === '人物') {
        this.hoveredNode = d;
        this.renderHoverInfo(d, event.pageX, event.pageY);
    }
    })
    .on("mouseout", () => {
    this.hoveredNode = null;
    this.hideHoverInfo();
    })
    .on("click", (event, d) => {
    this.selectedNode = d;
    this.renderNodeDetail(d);
    event.stopPropagation();
    });

    // 人物ノードは円で描画
    // 人物ノードの半径を大きくする
    node.filter(d => d.type === '人物')
        .append("circle")
        .attr("r", d => 45) // 元の35から45に増加
        .attr("fill", d => d.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

    // 人物以外のノードは四角形で描画 - 無彩色に
    const rectWidth = 120; // 四角形の幅を固定
    const padding = 10; // パディングを追加
    node.filter(d => d.type !== '人物')
        .append("rect")
        .attr("width", rectWidth + padding * 2) // パディングを考慮
        .attr("height", 70 + padding * 2) // 高さを少し増やしてテキストが収まるようにする
        .attr("x", -(rectWidth + padding * 2) / 2) // 中央揃え
        .attr("y", -(35 + padding)) // 高さに合わせて調整
        .attr("rx", 5) // 角を丸くする
        .attr("ry", 5)
        .attr("fill", "#E2E8F0") // 無彩色に統一
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

    // 人物以外のノードにタイプラベルを追加
    node.filter(d => d.type !== '人物')
        .append("rect")
        .attr("width", 40)
        .attr("height", 16)
        .attr("x", -20)
        .attr("y", 15)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", d => {
            // タイプに応じた色を設定
            if (d.type === '論考') return "#F6AD55"; // オレンジ
            if (d.type === '書籍') return "#F687B3"; // ピンク
            if (d.type === '組織') return "#805AD5"; // 紫
            return "#A0AEC0"; // デフォルトはグレー
        });

    // タイプラベルのテキスト
    node.filter(d => d.type !== '人物')
        .append("text")
        .text(d => d.type)
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("fill", "#fff")
        .attr("y", 25)
        .attr("pointer-events", "none");

    // ノードラベル描画 - 人物用
    // 人物ノードのラベル描画 - テキスト折り返し機能付き
    node.filter(d => d.type === '人物')
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "9px") // サイズはそのまま
        .attr("fill", "#fff")
        .attr("pointer-events", "none")
        .attr("dy", "-0.6em") // 少し上に調整
        .each(function(d) {
            const text = d3.select(this);
            const words = d.name.split(/\s+|(?<=[\u3001\u3002\uff0c\uff0e\u300c\u300d])/); // 空白と日本語の句読点で分割
            let line = "";
            const lineHeight = 1.1; // ems
            const width = 70; // 円の直径に近い値
            
            // 名前を1行目に表示
            for (let i = 0; i < words.length; i++) {
                const testLine = line + (line ? ' ' : '') + words[i];
                // 日本語かどうかを判定
                const isJapanese = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(words[i]);
                const estimatedWidth = isJapanese ? testLine.length * 11 : testLine.length * 6; // （11/6から変更）日本語は少し広めに見積もる
                
                if (estimatedWidth > width && i > 0) {
                    // 1行に収まらない場合は折り返し
                    text.append("tspan")
                        .attr("x", 0)
                        .attr("dy", 0)
                        .text(line);
                    
                    // 2行目
                    text.append("tspan")
                        .attr("x", 0)
                        .attr("dy", lineHeight + "em")
                        .text(words[i] + (i < words.length - 1 ? "..." : ""));
                    
                    break; // 2行までで打ち切り
                } else {
                    line = testLine;
                }
            }
            
            // 1行で収まる場合
            if (line && !text.selectAll("tspan").size()) {
                text.text(line);
            }
        });

    // 人物ノードにカテゴリを小さく表示 - 位置調整
    node.filter(d => d.type === '人物')
        .append("text")
        .text(d => d.category)
        .attr("dy", function(d) {
            // 名前が2行になっているかチェック
            const nameText = d3.select(this.parentNode).select("text");
            return nameText.selectAll("tspan").size() > 0 ? "1.6em" : "0.9em";
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("fill", "#fff")
        .attr("opacity", 0.8)
        .attr("pointer-events", "none");
        
    // ノードラベル描画 - 人物以外用（テキスト折り返し機能付き）
    node.filter(d => d.type !== '人物')
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("fill", "#4A5568") // 黒っぽい色
        .attr("pointer-events", "none")
        .attr("dy", "-0.5em")
        .each(function(d) {
            const text = d3.select(this);
            const words = d.name.split(/\s+|(?<=[\u3001\u3002\uff0c\uff0e\u300c\u300d])/); // 空白と日本語の句読点で分割
            let line = "";
            let lineNumber = 0;
            const lineHeight = 1.2; // ems
            const width = rectWidth - 20; // 余白を考慮
            
            // 1行目
            for (let i = 0; i < words.length; i++) {
                const testLine = line + (line ? ' ' : '') + words[i];
                
                // 行の幅をテスト（日本語の場合は文字数で概算）
                const isJapanese = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(words[i]);
                const estimatedWidth = isJapanese ? testLine.length * 11 : testLine.length * 6; // （11/6から変更）日本語は少し広めに見積もる
                
                if (estimatedWidth > width && i > 0) {
                    // 1行目を追加
                    text.append("tspan")
                        .attr("x", 0)
                        .attr("dy", lineNumber === 0 ? 0 : lineHeight + "em")
                        .text(line);
                    
                    line = words[i];
                    lineNumber++;
                    
                    // 最大2行までに制限
                    if (lineNumber >= 1 && i < words.length - 1) {
                        // 2行目
                        const nextLine = line;
                        for (let j = i + 1; j < words.length; j++) {
                            const testNextLine = nextLine + (nextLine ? ' ' : '') + words[j];
                            const nextIsJapanese = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(words[j]);
                            const nextEstimatedWidth = nextIsJapanese ? testNextLine.length * 11 : testNextLine.length * 6;
                            
                            if (nextEstimatedWidth <= width) {
                                line = testNextLine;
                                i = j;
                            } else {
                                // 入らない場合は省略記号を追加
                                line = nextLine + "...";
                                i = words.length; // ループを抜ける
                                break;
                            }
                        }
                        break;
                    }
                } else {
                    line = testLine;
                }
            }
            
            // 最後の行を追加
            if (line) {
                text.append("tspan")
                    .attr("x", 0)
                    .attr("dy", lineNumber === 0 ? 0 : lineHeight + "em")
                    .text(line);
            }
        });

    // 論考・書籍・組織ノードに年を小さく表示
    node.filter(d => d.year && d.type !== '人物')
    .append("text")
    .text(d => d.year)
    .attr("dy", "-1.5em") // 上部に移動
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "#4A5568") // より暗い色に
    .attr("font-weight", "bold")
    .attr("pointer-events", "none");

    // SVGの外側をクリックした時に選択を解除
    this.svg.on("click", () => {
    this.selectedNode = null;
    this.hideNodeDetail();
    });
    
    // シミュレーションを最適化して安定させる
    let ticked = 0;
    const maxTicks = 300; // 最大イテレーション数
    
    this.simulation.on("tick", () => {
        ticked++;
        
        // 一定回数のイテレーション後に固定
        if (ticked >= maxTicks) {
        this.simulation.stop();
        
        // ノードの位置を固定
        this.filteredNodes.forEach(node => {
            node.fx = node.x;
            node.fy = node.y;
        });
        }
        
        link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
        
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    }
    
    // ホバー情報表示
    renderHoverInfo(node, pageX, pageY) {
        this.hoverInfoEl.style.display = 'block';
        
        // ノードの右側に表示
        const offsetX = 20; // ノードからの水平距離
        this.hoverInfoEl.style.left = `${pageX + offsetX}px`;
        this.hoverInfoEl.style.top = `${pageY - 10}px`;
        
        let html = `
            <div class="hover-info-name">${node.name}</div>
            <div>${node.category}</div>
        `;
        
        if (node.tags && node.tags.length > 0) {
            html += '<div class="hover-info-tags">';
            node.tags.forEach(tag => {
            html += `<span class="hover-info-tag">${tag}</span>`;
            });
            html += '</div>';
        }
        
        this.hoverInfoEl.innerHTML = html;
    }
    
    // ホバー情報非表示
    hideHoverInfo() {
    this.hoverInfoEl.style.display = 'none';
    }
    
    // タイプに基づいた色を返す関数
    getTypeColor(type) {
        switch(type) {
            case '論考': return "#F6AD55"; // オレンジ
            case '書籍': return "#F687B3"; // ピンク
            case '組織': return "#805AD5"; // 紫
            default: return "#A0AEC0"; // グレー（デフォルト）
        }
    }

    // ノード詳細表示
    renderNodeDetail(node) {
        // 先に両方の詳細パネルを非表示に
        this.personDetailEl.style.display = 'none';
        this.nodeDetailEl.style.display = 'none';
        
        if (node.type === '人物') {
            // カテゴリーに応じた色を取得
            let categoryColor;
            switch (node.category) {
                case '建築家': categoryColor = '#4299E1'; break;
                case '写真家': categoryColor = '#F6AD55'; break;
                case '思想家': categoryColor = '#48BB78'; break;
                case 'デザイナー': categoryColor = '#F687B3'; break;
                default: categoryColor = '#A0AEC0';
            }
            
            // 人物詳細パネル
            let html = `
            <h3>${node.name}</h3>
            
            <div class="node-detail-section">
                <div class="node-detail-section-title">情報</div>
                <div class="node-detail-type">
                    <div class="node-detail-type-indicator" style="background-color: ${categoryColor}"></div>
                    <span>${node.category}</span>
                </div>
            </div>
            `;
            
            if (node.description) {
                html += `
                    <div class="node-detail-section">
                    <div class="node-detail-section-title">説明</div>
                    <p class="node-detail-description">${node.description}</p>
                    </div>
                `;
            }
            
            if (node.tags && node.tags.length > 0) {
                html += `
                    <div class="node-detail-section">
                    <div class="node-detail-section-title">タグ</div>
                    <div class="node-detail-tags">
                `;
                
                node.tags.forEach(tag => {
                    html += `<span class="node-detail-tag" onclick="map.filterByNodeName('${tag}')">${tag}</span>`;
                });
                
                html += '</div></div>';
            }
            
            html += `<button class="filter-button" onclick="map.filterByNodeName('${node.name}')">このノードでフィルター</button>`;
            
            this.personDetailEl.innerHTML = html;
            this.personDetailEl.style.display = 'block';
        } else {
            // 人物以外の詳細パネル (論考、書籍、組織)
            let html = `
            <button class="node-detail-close" onclick="map.hideNodeDetail()">✕</button>
            <h2>${node.name}</h2>
            
            <div class="node-detail-section">
                <div class="node-detail-section-title">情報</div>
                <div class="node-detail-type">
                <div class="node-detail-type-indicator" style="background-color: ${this.getTypeColor(node.type)}"></div>
                <span>${node.type}</span>
                </div>
                ${node.year ? `<div class="node-detail-year"><span class="font-medium">年:</span> ${node.year}</div>` : ''}
            </div>
            `;
            
            if (node.description) {
                html += `
                    <div class="node-detail-section">
                    <div class="node-detail-section-title">説明</div>
                    <p class="node-detail-description">${node.description}</p>
                    </div>
                `;
            }
            
            if (node.tags && node.tags.length > 0) {
                html += `
                    <div class="node-detail-section">
                    <div class="node-detail-section-title">タグ</div>
                    <div class="node-detail-tags">
                `;
                
                node.tags.forEach(tag => {
                    html += `<span class="node-detail-tag" onclick="map.filterByNodeName('${tag}')">${tag}</span>`;
                });
                
                html += '</div></div>';
            }
            
            // 関連する人物
            const relatedPeople = this.getRelatedPeople(node);
            
            if (relatedPeople.length > 0) {
                html += `
                    <div class="node-detail-section">
                    <div class="node-detail-section-title">関連する人物</div>
                    <div class="related-people">
                `;
                
                relatedPeople.forEach(person => {
                    html += `
                    <div class="related-person" onclick="map.selectNodeById('${person.id}')">
                        <div class="related-person-indicator"></div>
                        <div>
                        <div class="related-person-name">${person.name}</div>
                        <div class="related-person-category">${person.category}</div>
                        </div>
                    </div>
                    `;
                });
                
                html += '</div></div>';
            }
            
            html += `<button class="filter-button" onclick="map.filterByNodeName('${node.name}')">このノードでフィルター</button>`;
            
            this.nodeDetailEl.innerHTML = html;
            this.nodeDetailEl.style.display = 'block';
        }
    }
    
    // ノード詳細非表示
    hideNodeDetail() {
    this.personDetailEl.style.display = 'none';
    this.nodeDetailEl.style.display = 'none';
    this.selectedNode = null;
    }
    
    // 関連する人物取得（重複排除）
    getRelatedPeople(node) {
    // 関連する人物のIDを集める
    const relatedPersonIds = this.links
        .filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return ((sourceId === node.id && targetId.startsWith('person-')) || 
                (targetId === node.id && sourceId.startsWith('person-'))) &&
                link.type === '説明文関連';
        })
        .map(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId.startsWith('person-') ? sourceId : targetId;
        });
    
    // 重複を排除
    const uniquePersonIds = [...new Set(relatedPersonIds)];
    
    // 人物ノードを取得
    return uniquePersonIds
        .map(personId => this.nodes.find(n => n.id === personId))
        .filter(person => person); // undefinedを排除
    }
    
    // ノード名でフィルター
    filterByNodeName(name) {
        // 現在のズーム状態を保存
        const currentTransform = d3.zoomTransform(this.svg.node());
        
        // 検索フィルターを設定
        this.searchInput.value = name;
        this.searchFilter = name;
        
        // 再描画
        this.render();
        
        // 描画後に保存したズーム状態を復元
        setTimeout(() => {
            this.svg.call(
                this.zoom.transform,
                currentTransform
            );
        }, 10); // 少し遅延させて確実に再描画後に実行
    }
    
    // IDでノードを選択
    selectNodeById(id) {
        const node = this.nodes.find(n => n.id === id);
        if (node) {
        this.selectedNode = node;
        this.renderNodeDetail(node);
        }
    }
    
    // ズームイン
    handleZoomIn() {
        const currentTransform = d3.zoomTransform(this.svg.node());
        
        // 10%刻みで拡大 (最大200%)
        const newScale = Math.min(Math.round((currentTransform.k + 0.1) * 10) / 10, 2.0);
        const newTransform = d3.zoomIdentity
        .translate(currentTransform.x, currentTransform.y)
        .scale(newScale);
        
        this.svg.transition().duration(300).call(
        this.zoom.transform, newTransform
        );
    }
    
    // ズームアウト
    handleZoomOut() {
        const currentTransform = d3.zoomTransform(this.svg.node());
        
        // 10%刻みで縮小 (最小30%)
        const newScale = Math.max(Math.round((currentTransform.k - 0.1) * 10) / 10, 0.3);
        const newTransform = d3.zoomIdentity
        .translate(currentTransform.x, currentTransform.y)
        .scale(newScale);
        
        this.svg.transition().duration(300).call(
        this.zoom.transform, newTransform
        );
    }

    // ズームリセット
    handleZoomReset() {
        // リセット
        this.svg.transition().duration(300).call(
        this.zoom.transform, 
        d3.zoomIdentity.translate(this.dimensions.width / 2, this.dimensions.height / 2).scale(0.8)
        );
    }

    // 現在のズーム状態を保存
    saveCurrentTransform() {
        if (this.svg && this.svg.node()) {
            this._savedTransform = d3.zoomTransform(this.svg.node());
        }
    }
}

// グローバルインスタンス作成
let map;
document.addEventListener('DOMContentLoaded', () => {
map = new RelationshipMap();
});

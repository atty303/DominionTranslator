// javascript:(function(){var s=document.createElement('script');s.src='http://atty303.github.io/DominionTranslator/src/dominionTranslator.js';document.head.appendChild(s);s.parentNode.removeChild(s);}());

(function ($) {
    "use strict";

    var Global = {
        language: window._dtLang || 'ja'
    };

    /**
     * メイン処理: Bookmarklet がロードされた時に実行される。
     */
    var main = function () {
        if (!(window.location.host === 'play.goko.com' && window.location.pathname.indexOf('/Dominion/gameClient.html') === 0)) {
            NotificationWidget.error('<a href="http://play.goko.com/Dominion/gameClient.html" target="_blank">Dominion Online</a> を開いてからブックマークレットを実行してください。');
            return;
        }

        if (document.readyState !== 'complete') {
            $(document).on('readystatechange', function () {
                if (document.readyState === 'complete') {
                    loadMessageCatalog(Global.language);
                }
            });
        } else {
            loadMessageCatalog(Global.language);
        }
    };

    /**
     * JSONP で翻訳カタログをロードする。
     */
    var loadMessageCatalog = function (lang) {
        window._dominionTranslatorCallback = onMessageCatalogLoaded;
        $('<script/>')
            .attr('src', 'http://atty303.github.io/DominionTranslator/src/messageCatalog.' + lang + '.js')
            .appendTo($('head'))
            .remove();
    };

    /**
     * JSONP による翻訳カタログのロードが完了した時に呼ばれるコールバック
     *
     * ゲームクライアントへの翻訳メッセージの注入を行う。
     *
     * @param messageCatalog 翻訳カタログ
     */
    var onMessageCatalogLoaded = function (messageCatalog) {
        try {
            injectMessagesToCardBuilder(messageCatalog);

            if (Global.language === 'ja') {
                injectCardHelperAdvice();
            }
        } catch (e) {
            NotificationWidget.error('日本語化に失敗しました。');
            throw e;
        }

        NotificationWidget.info('日本語化に成功しました。');

        window.openCardEditor = function () {
            var editor = new CardEditor(messageCatalog);
            editor.open();
        };
    };

    var findCardObject = function (cards, nameId) {
        var i;
        for (i = 0; i < cards.length; ++i) {
            if (cards[i].nameId === nameId) { return cards[i]; }
        }
        return null;
    };

    var clearCardRenderCache = function (cardBuilder) {
        cardBuilder._cardImageCache = {};
        cardBuilder.lruListHead = null;
        cardBuilder.lruListSize = 0;
    };

    var injectMessagesToCardBuilder = function (messagesCatalog) {
        var cardTypes = FS.Dominion.CardBuilder.Data.cardTypes,
            cards = FS.Dominion.CardBuilder.Data.cards,
            cardBuilder = FS.Dominion.CardBuilder.getInstance(),
            key, i;

        for (key in messagesCatalog.cardTypes) {
            cardTypes[key]['0'] = messagesCatalog.cardTypes[key]
        }

        for (i = 0; i < messagesCatalog.cards.length; ++i) {
            var cardMessage = messagesCatalog.cards[i],
                cardObj = findCardObject(cards, cardMessage.nameId);

            if (cardObj !== null) {
                cardObj.name['0'] = cardMessage.name;
                cardObj.text['0'] = compileCardText(cardMessage.text);
            }
        }

        clearCardRenderCache(cardBuilder);
    };

    var injectCardHelperAdvice = function () {
        var CardHelper = FS.Dominion.CardBuilder.CardHelper,
            _unifyCardData = CardHelper._unifyCardData;

        CardHelper._unifyCardData = function () {
            var bHalfSize = arguments[3],
                res = _unifyCardData.apply(this, arguments);

            if (bHalfSize) {
                if (res.bCardTypeTwoLines)
                    res.cardTypeFontSize = 17;
                else if (res.cardTypeLen >= 17)
                    res.cardTypeFontSize = 15;
                else if (res.cardTypeLen >= 13)
                    res.cardTypeFontSize = 17;
                else if (res.cardTypeLen >= 12)
                    res.cardTypeFontSize = 20;
                else
                    res.cardTypeFontSize = 22;
            } else {
                if (res.bCardTypeTwoLines)
                    res.cardTypeFontSize = 17;
                else if (res.cardTypeLen >= 14)
                    res.cardTypeFontSize = 17;
                else if (res.cardTypeLen >= 12)
                    res.cardTypeFontSize = 20;
                else
                    res.cardTypeFontSize = 24;
            }

            return res;
        };
    };

    var compileCardText = (function () {
        var normalizeChars = {
            from: '０１２３４５６７８９＋、。「」',
            to: '0123456789+､｡｢｣'
        };

        var normalizeCharsRe = [];
        for (var i = 0; i < normalizeChars.from.length; ++i) {
            normalizeCharsRe.push(new RegExp(normalizeChars.from[i], 'g'));
        }

        var normalizeText = function (s) {
            var i, from, to;

            for (i = 0; i < normalizeCharsRe.length; ++i) {
                from = normalizeCharsRe[i];
                to = normalizeChars.to[i];

                s = s.replace(from, to);
            }

            s = s.replace(/[+]([0-9])/g, '+$1 ');
            s = s.replace(/([0-9a-zA-Z+-/ ]+)/g, '/h-1$1/h-2');

            return s;
        };

        var parseSourceText = function (source) {
            var lines = [],
                i, line, tokens, command, text, m, isSmall = false;

            for (i = 0; i < source.length; ++i) {
                tokens = source[i].split('|');
                if (tokens.length === 1) {
                    command = '';
                    text = tokens[0];
                } else {
                    command = tokens.shift();
                    text = tokens.join('|');
                }

                if (command.indexOf('s') >= 0) {
                    isSmall = true;
                }

                line = {
                    isPadding: false,
                    plainText: normalizeText(text),
                    fontSize: 20,
                    height: 24,
                    fixedHeight: 0,
                    willNarrowHeight: false,
                    isBold: false
                };

                if (command.indexOf('#') >= 0) {
                    line.fontSize = 24;
                    line.height = 28;
                    line.isBold = true;
                } else if (command.indexOf('*') >= 0) {
                    line.fontSize = 18;
                    line.height = 22;
                }

                if (isSmall) {
                    line.fontSize -= 2;
                    line.height -= 2;
                }

                m = command.match(/~(\d?)/);
                if (m) {
                    line.plainText = ' ';
                    line.height = Math.floor(line.height * (m[1] ? parseInt(m[1], 10) : 10) / 10);
                }

                if (command.indexOf('-') >= 0) {
                    line.plainText = '/h00────────────────────/h-2';
                    line.fontSize = 18;
                    line.height = 12;
                }

                if (/\/V/.test(text)) {
                    line.height = line.fixedHeight = 88;
                } else if (/\/C/.test(text)) {
                    line.height = line.fixedHeight = 85;
                } else if (/\/v/.test(text)) {
                    line.fixedHeight = 44 - 12;
                    line.willNarrowHeight = true;
                } else if (/\/c/.test(text)) {
                    line.fixedHeight = 44 - 6;
                    line.willNarrowHeight = true;
                } else if (/\/p/.test(text)) {
                    line.height = line.fixedHeight = 38;
                }

                line.marginTop = line.marginBottom = 0;
                line._height = Math.max(line.fixedHeight, line.height);

                lines.push(line);
            }

            return lines;
        };

        var eachLine = function (lines, callback) {
            var i, prev, next;

            for (i = 0; i < lines.length; ++i) {
                prev = (i - 1 >= 0 ? lines[i - 1] : null);
                next = (i + 1 < lines.length ? lines[i + 1] : null);
                callback(lines[i], prev, next);
            }
        };

        var adjustLineSpacing = function (lines) {
            var i, line, diff, margin, paddedLines;

            for (i = 0; i < lines.length; ++i) {
                line = lines[i];
                if (line.willNarrowHeight && line.fixedHeight > line.height) {
                    diff = line.fixedHeight - line.height;
                    margin = Math.floor(diff / 2);

                    if (lines[i - 1] && !lines[i - 1].willNarrowHeight) {
                        lines[i - 1]._height -= diff;
                        if (!(lines[i - 2] && lines[i - 2].willNarrowHeight)) {
                            lines[i - 1].marginTop = margin;
                        }
                    }
                    if (lines[i + 1] && !lines[i + 1].willNarrowHeight) {
                        lines[i + 1]._height -= diff;
                        if (!(lines[i + 2] && lines[i + 2].willNarrowHeight)) {
                            lines[i + 1].marginBottom = margin;
                        }
                    }
                }
            }

            paddedLines = [];
            eachLine(lines, function (line, prev, next) {
                if (line.marginTop > 0) {
                    paddedLines.push({ isPadding: true, _height: line.marginTop })
                }

                paddedLines.push(line);

                if (line.marginBottom > 0) {
                    paddedLines.push({ isPadding: true, _height: line.marginBottom })
                }
            });

            return paddedLines;
        };

        var buildCompiledText = function (lines) {
            var fontSize = 24,
                height = 10,
                isBold = false,
                i, compiledText, line;

            // 全カードに共通の設定
            // - テキスト全体の縦位置が標準では少し上寄りになっているので、もっと中央寄りになるよう先頭に空行を入れる
            // - カーニングを設定
            compiledText = '/s10 /n/h-2';

            for (i = 0; i < lines.length; ++i) {
                line = lines[i];

                if (i > 0) {
                    compiledText += '/n';
                }

                if (line._height !== height) {
                    height = line._height;
                    compiledText += '/s' + ('0' + height).substr(-2);
                }

                if (line.isPadding) {
                    compiledText += ' ';
                } else {
                    if (line.fontSize !== undefined && line.fontSize !== fontSize) {
                        fontSize = line.fontSize;
                        compiledText += '/f' + ('0' + fontSize).substr(-2);
                    }
                    if (line.isBold !== undefined && line.isBold !== isBold) {
                        isBold = line.isBold;
                        compiledText += '/t' + (isBold ? '1' : '0');
                    }
                    compiledText += line.plainText;
                }

            }

            return compiledText;
        };

        var compile = function (source) {
            var lines;

            lines = parseSourceText(source);
            lines = adjustLineSpacing(lines);

            return buildCompiledText(lines);
        };

        return function (source) {
            return typeof source === 'string' ? source : compile(source);
        };
    }());

    /**
     * カードテキストのエディタ
     */
    var CardEditor = (function () {
        /**
         * コンストラクタ
         *
         * @param messageCatalog 編集対象とする翻訳カタログ
         * @constructor
         */
        var CardEditor = function (messageCatalog) {
            var self = this, cardIds;

            this.isAssetsLoaded = false;
            this.messageCatalog = messageCatalog;

            this.cards = FS.Dominion.CardBuilder.Data.cards;
            this.cardBuilder = FS.Dominion.CardBuilder.getInstance();

            this.$el = this._createTemplate();
            this.$cardId = $('#ceId', this.$el);
            this.$cardSelect = $('#ceSelect', this.$el);
            this.$cardName = $('#ceName', this.$el);
            this.$cardText = $('#ceText', this.$el);
            this.$cardSource = $('#ceSource', this.$el);
            this.$cardSourceJson = $('#ceSourceJson', this.$el);
            this.$ceCard = $('#ceCard', this.$el);

            this.renderDelayTimer = null;

            this._setupEvents();

            cardIds = this._setupCardSelector();
            this.cardBuilder.loadCardAssets({
                cards: cardIds,
                callback: function () {
                    self.isAssetsLoaded = true;
                    self._onCardSelectChanged();
                }
            });
        };

        /**
         * エディタを開く。
         */
        CardEditor.prototype.open = function () {
            $(document.body).append(this.$el);
        };

        /**
         * エディタを閉じる。
         */
        CardEditor.prototype.close = function () {
            this.$el.detach();
        };

        /**
         * 編集対象のカードを設定する。
         *
         * @param cardId 編集対象のカードID
         */
        CardEditor.prototype.setCard = function (cardId) {
            var cardData = findCardObject(this.cards, cardId),
                cardMessage = findCardObject(this.messageCatalog.cards, cardId);

            if (!cardMessage) {
                cardMessage = {
                    nameId: cardId,
                    name: cardData.name['0'],
                    text: cardData.text['0']
                };
                this.messageCatalog.cards[cardId] = cardMessage;
            }

            this.$cardId.val(cardId);
            this.$cardSelect.val(cardId);
            this.$cardName.val(cardMessage.name);
            if (typeof cardMessage.text === 'string') {
                this.$cardText.val(cardMessage.text);
                this.$cardSource.val('');
            } else {
                this.$cardText.val('');
                this.$cardSource.val(cardMessage.text.join('\n'));
            }

            this.renderCurrentState();
        };

        CardEditor.prototype.getCard = function () {
            return this.$cardSelect.val();
        };

        CardEditor.prototype.renderCurrentState = function () {
            this._populateCatalogWithCurrentState();
            this._renderSourceJson();

            this.$ceCard.empty();
            this._clearRenderCache();

            this.renderCard(this.getCard());
        };

        CardEditor.prototype._clearRenderCache = function () {
            clearCardRenderCache(this.cardBuilder);
        };

        CardEditor.prototype.renderCard = function (cardId) {
            var cardData = findCardObject(this.cards, cardId),
                cardMessage = findCardObject(this.messageCatalog.cards, cardId);

            cardData.name['0'] = cardMessage.name;
            cardData.text['0'] = compileCardText(cardMessage.text);

            if (this.isAssetsLoaded) {
                this._appendCard({ card: cardId });
                //this._appendCard({ card: cardId, width: 170, height: 256 });
                //this._appendCard({ card: cardId, displayMode: 'HALFIMAGE' });
            }
        };

        CardEditor.prototype._appendCard = function (opts) {
            var cardCanvas = this.cardBuilder.getCard(opts);
            $(cardCanvas).css('float', 'left');
            this.$ceCard.append(cardCanvas);
        };

        CardEditor.prototype.renderAllCards = function () {
            var self = this;

            this.$ceCard.empty();
            this._clearRenderCache();

            $('option', this.$cardSelect).each(function () {
                var cardId = $(this).val();

                self.renderCard(cardId);
            });
        };

        CardEditor.prototype._createTemplate = function () {
            var html = [
                '<div id="cardEditor" style="width: 100%; height: 100%; background: white; position: absolute; z-index: 1000; padding: 10px; overflow: scroll;">',
                '  <div>',
                '    cardId: <input id="ceId" type="text" readonly="readonly"/><select id="ceSelect" style="top: 0; visibility: visible;"></select><br/>',
                '    name: <input id="ceName" type="text" style="width: 30%;"><br/>',
                '    text: <input id="ceText" type="text" style="width: 80%;"><br/>',
                '    source: <textarea id="ceSource" cols="40" rows="5"></textarea><input id="ceSourceJson" type="text" /><br/>',
                '    <button id="ceRender">render</button>',
                '    <button id="ceRenderAll">render all</button>',
                '    <button id="ceClose">close</button>',
                '  </div>',
                '  <div id="ceCard"></div>',
                '</div>'
            ].join('\n');

            return $(html);
        };

        CardEditor.prototype._setupEvents = function () {
            var self = this;
            this.$el
                .on('click', '#ceClose', function () { self.close(); })
                .on('click', '#ceRender', function () { self.renderCurrentState(); })
                .on('click', '#ceRenderAll', function () { self.renderAllCards(); })
                .on('change', '#ceSelect', function () { self._onCardSelectChanged(); })
                .on('keyup', '#ceName, #ceText, #ceSource', function () { self._onCardNameTextChanged(); });
        };

        CardEditor.prototype._setupCardSelector = function () {
            var cardIds = [],
                cardData, i;

            this.$cardSelect.empty();
            for (i = 0; i < this.cards.length; ++i) {
                cardData = this.cards[i];
                cardIds.push(cardData.nameId);
                this.$cardSelect.append(
                    $('<option/>').attr('value', cardData.nameId).text(cardData.nameId + ' - ' + cardData.set)
                );
            }

            return cardIds;
        };

        /**
         * 現在の編集状態を翻訳カタログへ反映する。
         * @private
         */
        CardEditor.prototype._populateCatalogWithCurrentState = function () {
            var cardId = this.getCard(),
                cardMessage = findCardObject(this.messageCatalog.cards, cardId),
                textSource;

            textSource = this._parseTextSource(this.$cardSource.val());
            cardMessage.text = (textSource.length > 0 ? textSource : this.$cardText.val());
            cardMessage.name = this.$cardName.val();
        };

        CardEditor.prototype._parseTextSource = function (multilineSource) {
            var rawLines = multilineSource.split('\n'),
                lines = [],
                i;

            for (i = 0; i < rawLines.length; ++i) {
                if (rawLines[i]) { lines.push(rawLines[i]); }
            }
            return lines;
        };

        CardEditor.prototype._renderSourceJson = function () {
            var v = '',
                textSource;

            textSource = this._parseTextSource(this.$cardSource.val());
            if (textSource.length > 0) {
                v = JSON.stringify(textSource);
            }

            this.$cardSourceJson.val(v);

            if (v) {
                this.$cardText.val(compileCardText(textSource));
            }
        };

        CardEditor.prototype._onCardSelectChanged = function () {
            this.setCard(this.getCard());
        };

        CardEditor.prototype._onCardNameTextChanged = function () {
            var self = this;

            if (this.renderDelayTimer !== null) {
                clearTimeout(this.renderDelayTimer);
            }
            this.renderDelayTimer = setTimeout(function () {
                self.renderCurrentState();
            }, 500);
        };

        return CardEditor;
    }());

    /**
     * 通知ウィジェットクラス
     *
     * jQuery のロードされていないページで実行される可能性があるため、jQuery は利用していない。
     */
    var NotificationWidget = (function () {
        var NotificationWidget = function (spec) {
            spec = {
                severity: spec.severity || 'info',
                message: spec.message || '',
                timeout: spec.timeout || 3000
            };

            this.el = this._createTemplate();

            this.setSeverity(spec.severity);
            this.setMessage(spec.message);
            this.setTimeout(spec.timeout);
        };

        NotificationWidget.info = function (message, timeout) {
            var widget = new NotificationWidget({ severity: 'info', message: message, timeout: timeout });
            return widget.show();
        };

        NotificationWidget.error = function (message, timeout) {
            var widget = new NotificationWidget({ severity: 'error', message: message, timeout: timeout });
            return widget.show();
        };

        NotificationWidget.prototype.setSeverity = function (severity) {
            if (severity === 'info') {
                this.el.style.borderTopColor = 'green';
            } else if (severity === 'error' ) {
                this.el.style.borderTopColor = 'red';
            } else {
                this.el.style.borderTopColor = 'white';
            }
        };

        NotificationWidget.prototype.setMessage = function (message) {
            this.el.innerHTML = message;
        };

        NotificationWidget.prototype.setTimeout = function (msecs) {
            this.timeout = msecs;
        };

        NotificationWidget.prototype.show = function () {
            var self = this;

            document.body.appendChild(this.el);

            if (this.timeout > 0) {
                setTimeout(function () { self.hide(); }, this.timeout);
            }

            return this;
        };

        NotificationWidget.prototype.hide = function () {
            if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        };

        NotificationWidget.prototype._createTemplate = function () {
            var html = [
                '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 20px; z-index: 99999; padding: 20px; opacity: 0.95; border-top: 5px solid white;',
                '  text-align: center; font: sans-serif 20px normal; background: white; color: black;',
                '  -moz-box-sizing: content-box; -webkit-box-sizing: content-box; box-sizing: content-box;',
                '  -moz-box-shadow: 0 5px 10px 2px rgba(0, 0, 0, 0.8); -webkit-box-shadow: 0 5px 10px 2px rgba(0, 0, 0, 0.8); box-shadow: 0 5px 10px 2px rgba(0, 0, 0, 0.8);">',
                '</div>'
            ].join('\n');

            var div = document.createElement('div');
            div.innerHTML = html;
            return div.childNodes[0];
        };

        return NotificationWidget;
    }());

    // ================================================================

    main();

}(window.jQuery));

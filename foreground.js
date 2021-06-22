/* EXTRA HACK SINCE IN ODOO PAGES GETS INITIALIZED TWICE */
if (!('DOMUI' in window)) {
    /* UI AND DOM HELPERS */
    const DOMUI = {
        body: document.querySelector('body'),
        createElement () {
            const section = document.createElement('section');
            section.id = 'floating_helper';
            section.addEventListener('click', this.onClickHelper.bind(this));
            section.addEventListener('contextmenu', this.onContextMenuHelper.bind(this));
            section.innerText = 'Háblame...'
            this.body.appendChild(section);
            this.el = section;
        },
        registerResultTarget ({ idx, target, stopper, deleteCount }) {
            this.idx = idx;
            this.deleteCount = deleteCount;
            this.target = target;
            this.stopper = stopper;
        },
        show (text) {
            this.el.innerText = text;
        },
        onContextMenuHelper (ev) {
            ev?.preventDefault();
            ev?.stopPropagation();
            this.el.remove();
            this.stopper();
        },
        onClickHelper () {
            switch (this.target.tagName) {
                case 'INPUT':
                case 'TEXTAREA':
                    original = Array.from(this.target.value)
                    original.splice(this.idx, this.deleteCount, this.el.innerText);
                    this.target.value = original.join('');
                    break;
                default:
                    break;
            }
            this.onContextMenuHelper();
        },
        effect (effect, instant) {
            this.body.classList.remove('speech-loading-keyframes', 'speech-error', 'speech-success');
            if (instant) return this.body.classList.add(effect);
            setTimeout(() => this.body.classList.add(effect), 100);
        },
    };
    /* STATES AND STATE MACHINE */
    const State = {
        enter ({ motor, signal }) {
            this.motor = motor;
            this.signal = signal;
        },
        onResult (ev) {
            return ev.results.length ? {
                transcript: ev.results[0][0]?.transcript,
                isFinal: ev.results[0].isFinal
            } : {}
        },
    }
    const Raw = {
        ...State,
        onResult () {
            const { transcript, isFinal } = State.onResult.apply(this, arguments);
            DOMUI.show(transcript);
            if (isFinal) this.signal('Done');
        },
    }
    const Done = {
        ...State,
        enter () {
            State.enter.apply(this, arguments);
            this.motor.stop();
        }
    }
    const Machine = {
        initial: 'Raw',
        states: { Raw, Done },
        onSignalEmmited (state) {
            this.current = this.states[state];
            this.current.enter({
                motor: this.motor,
                signal: this.onSignalEmmited.bind(this),
            });
        },
        init () {
            DOMUI.effect('speech-loading-keyframes', true);
            this.setMotor();
            this.motor.start();
            this.onSignalEmmited(this.initial);
        },
        setMotor () {
            this.motor = new webkitSpeechRecognition();
            this.motor.lang = 'es-MX';
            this.motor.continuous = true;
            this.motor.interimResults = true;
            this.motor.onresult = ev => this.onResult(ev);
            this.motor.onerror = ev => this.onError(ev);
            this.motor.onstart = () => this.onStart();
            this.motor.onend = () => this.onEnd();
        },
        onResult (ev) {
            this.current?.onResult(ev);
        },
        onError () {
            this.motor.stop();
            DOMUI.effect('speech-error');
        },
        onStart () {
            DOMUI.registerResultTarget({
                idx: document.activeElement.selectionStart,
                deleteCount: document.activeElement.selectionEnd - document.activeElement.selectionStart,
                target: document.activeElement,
                stopper: this.onEnd.bind(this),
            });
            DOMUI.createElement();
            DOMUI.effect('speech-success');
        },
        onEnd () {
            this.motor.stop();
            DOMUI.effect('speech-success');
        }
    }
    /* MESSAGING SYSTEM */
    chrome.runtime.onMessage.addListener(({ cmd }) => {
        switch (cmd) {
            case 'start':
                Machine.init();
                break;
            default:
        }
    });
}

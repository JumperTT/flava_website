### flava extra 1.0 帮助文档 键盘 API 数字对照表

---

如果你需要检测键盘事件，我整理了 ImGui 键盘对应数字的表格，你可以自己来查

```text
0~511：ImGui内部预留区间，请勿使用
512: Tab（制表符）
513: LeftArrow（左箭头）
514: RightArrow（右箭头）
515: UpArrow（上箭头）
516: DownArrow（下箭头）
517: PageUp（上页键）
518: PageDown（下页键）
519: Home
520: End
521: Insert
522: Delete
523: Backspace（退格键）
524: Space（空格键）
525: Enter（回车键）
526: Escape（ESC键）
527: LeftCtrl（左Ctrl键）
528: LeftShift（左Shift键）
529: LeftAlt（左Alt键）
530: LeftSuper（左Win键/左Cmd键）
531: RightCtrl（右Ctrl键）
532: RightShift（右Shift键）
533: RightAlt（右Alt键）
534: RightSuper（右Win键/右Cmd键）
535: Menu（菜单键）
536: 0（主键盘数字0）
537: 1（主键盘数字1）
538: 2（主键盘数字2）
539: 3（主键盘数字3）
540: 4（主键盘数字4）
541: 5（主键盘数字5）
542: 6（主键盘数字6）
543: 7（主键盘数字7）
544: 8（主键盘数字8）
545: 9（主键盘数字9）
546: A（字母A）
547: B（字母B）
548: C（字母C）
549: D（字母D）
550: E（字母E）
551: F（字母F）
552: G（字母G）
553: H（字母H）
554: I（字母I）
555: J（字母J）
556: K（字母K）
557: L（字母L）
558: M（字母M）
559: N（字母N）
560: O（字母O）
561: P（字母P）
562: Q（字母Q）
563: R（字母R）
564: S（字母S）
565: T（字母T）
566: U（字母U）
567: V（字母V）
568: W（字母W）
569: X（字母X）
570: Y（字母Y）
571: Z（字母Z）
572: F1（功能键F1）
573: F2（功能键F2）
574: F3（功能键F3）
575: F4（功能键F4）
576: F5（功能键F5）
577: F6（功能键F6）
578: F7（功能键F7）
579: F8（功能键F8）
580: F9（功能键F9）
581: F10（功能键F10）
582: F11（功能键F11）
583: F12（功能键F12）
584: F13（功能键F13）
585: F14（功能键F14）
586: F15（功能键F15）
587: F16（功能键F16）
588: F17（功能键F17）
589: F18（功能键F18）
590: F19（功能键F19）
591: F20（功能键F20）
592: F21（功能键F21）
593: F22（功能键F22）
594: F23（功能键F23）
595: F24（功能键F24）
596: Apostrophe（单引号'）
597: Comma（逗号,）
598: Minus（减号-）
599: Period（句号.）
600: Slash（斜杠/）
601: Semicolon（分号;）
602: Equal（等号=）
603: LeftBracket（左方括号[）
604: Backslash（反斜杠\）
605: RightBracket（右方括号]）
606: GraveAccent（反引号`）
607: CapsLock（大写锁定键）
608: ScrollLock（滚动锁定键）
609: NumLock（数字锁定键）
610: PrintScreen（截屏键）
611: Pause（暂停键）
612: Keypad0（小键盘0）
613: Keypad1（小键盘1）
614: Keypad2（小键盘2）
615: Keypad3（小键盘3）
616: Keypad4（小键盘4）
617: Keypad5（小键盘5）
618: Keypad6（小键盘6）
619: Keypad7（小键盘7）
620: Keypad8（小键盘8）
621: Keypad9（小键盘9）
622: KeypadDecimal（小键盘小数点）
623: KeypadDivide（小键盘除号/）
624: KeypadMultiply（小键盘乘号*）
625: KeypadSubtract（小键盘减号-）
626: KeypadAdd（小键盘加号+）
627: KeypadEnter（小键盘回车）
628: KeypadEqual（小键盘等号=）
629: AppBack（浏览器后退键）
630: AppForward（浏览器前进键）
631: Oem102（非美式键盘反斜杠键）
632: GamepadStart（Xbox菜单键/Switch +键/PS选项键）
633: GamepadBack（Xbox视图键/Switch -键/PS分享键）
634: GamepadFaceLeft（Xbox X键/Switch Y键/PS Square键）
635: GamepadFaceRight（Xbox B键/Switch A键/PS Circle键）
636: GamepadFaceUp（Xbox Y键/Switch X键/PS Triangle键）
637: GamepadFaceDown（Xbox A键/Switch B键/PS Cross键）
638: GamepadDpadLeft（方向键左）
639: GamepadDpadRight（方向键右）
640: GamepadDpadUp（方向键上）
641: GamepadDpadDown（方向键下）
642: GamepadL1（Xbox左肩键/Switch L键/PS L1键）
643: GamepadR1（Xbox右肩键/Switch R键/PS R1键）
644: GamepadL2（Xbox左扳机/Switch ZL键/PS L2键，模拟量）
645: GamepadR2（Xbox右扳机/Switch ZR键/PS R2键，模拟量）
646: GamepadL3（左摇杆按下）
647: GamepadR3（右摇杆按下）
648: GamepadLStickLeft（左摇杆左推，模拟量）
649: GamepadLStickRight（左摇杆右推，模拟量）
650: GamepadLStickUp（左摇杆上推，模拟量）
651: GamepadLStickDown（左摇杆下推，模拟量）
652: GamepadRStickLeft（右摇杆左推，模拟量）
653: GamepadRStickRight（右摇杆右推，模拟量）
654: GamepadRStickUp（右摇杆上推，模拟量）
655: GamepadRStickDown（右摇杆下推，模拟量）
656: MouseLeft（鼠标左键）
657: MouseRight（鼠标右键）
658: MouseMiddle（鼠标中键）
659: MouseX1（鼠标侧键1）
660: MouseX2（鼠标侧键2）
661: MouseWheelX（鼠标水平滚轮）
662: MouseWheelY（鼠标垂直滚轮）
663: ReservedForModCtrl（ImGui内部保留Ctrl标识，请勿业务使用）
664: ReservedForModShift（ImGui内部保留Shift标识，请勿业务使用）
665: ReservedForModAlt（ImGui内部保留Alt标识，请勿业务使用）
666: ReservedForModSuper（ImGui内部保留Super标识，请勿业务使用）
```

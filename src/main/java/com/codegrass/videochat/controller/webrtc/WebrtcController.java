package com.codegrass.videochat.controller.webrtc;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Slf4j
@Controller
public class WebrtcController {

    @GetMapping("/videoChat/{roomId}/{type}")
    public String videoChat(@PathVariable String roomId, @PathVariable String type, Model model) {
        if("member".equals(type) || "manager".equals(type)) {
            model.addAttribute("roomId", roomId);
            return "video-chat";
        }
        return null;
    }

    @GetMapping("/videoChat/{roomId}/kickedOut")
    public String kickedOut(@PathVariable String roomId, Model model) {
        model.addAttribute("roomId", roomId);
        return "kicked-out";
    }
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to David's Mom",
      "parent_mode": "Parent Mode",
      "child_mode": "Child Mode",
      "login": "Login",
      "register": "Register",
      "phone": "Phone Number",
      "username": "Username",
      "password": "Password",
      "confirm_password": "Confirm Password",
      "submit": "Submit",
      "has_account": "Already have an account? Login",
      "no_account": "No account? Register",
      "passwords_not_match": "Passwords do not match",
      "register_success": "Registration Successful",
    }
  },
  zh: {
    translation: {
      "welcome": "欢迎来到 David's Mom",
      "parent_mode": "家长模式",
      "child_mode": "儿童模式",
      "login": "登录",
      "register": "注册",
      "phone": "手机号",
      "username": "用户名",
      "password": "密码",
      "confirm_password": "确认密码",
      "submit": "提交",
      "has_account": "已有账号？去登录",
      "no_account": "没有账号？点击注册",
      "passwords_not_match": "两次输入的密码不一致",
      "register_success": "注册成功",
      "dashboard": "管理首页",
      "word_library": "单词库",
      "learning_settings": "学习设置",
      "learning_report": "学习报告",
      "add_word": "添加单词",
      "search_word": "搜索单词",
      "word_list": "单词列表",
      "daily_goal": "每日目标",
      "start_learning": "开始学习",
      "remembered": "记住了",
      "forgot": "不认识",
      "congratulations": "恭喜完成！",
      "today_learned": "今日学习",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "zh", // Default to Chinese as requested for Parent Interface
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;

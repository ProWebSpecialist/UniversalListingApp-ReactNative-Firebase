import React from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
  BackHandler
} from "react-native";
import Button from "react-native-button";
import StarRating from "react-native-star-rating";
import FastImage from "react-native-fast-image";
import { firebaseListing } from "../firebase";
import { connect } from "react-redux";
import ActionSheet from "react-native-actionsheet";
import {
  AppIcon,
  AppStyles,
  HeaderButtonStyle,
  TwoColumnListStyle
} from "../AppStyles";
import HeaderButton from "../components/HeaderButton";
import PostModal from "../components/PostModal";
import SavedButton from "../components/SavedButton";
import { Configuration } from "../Configuration";
import { IMLocalized } from "../Core/localization/IMLocalization";
import DynamicAppStyles from "../DynamicAppStyles";
import ListingAppConfig from '../ListingAppConfig';

class HomeScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: IMLocalized("Home"),
    headerLeft: () => {
      return (
        <TouchableOpacity onPress={() => navigation.navigate("MyProfile")}>
          {navigation.state.params && navigation.state.params.menuIcon ? (
            <FastImage
              style={styles.userPhoto}
              resizeMode={FastImage.resizeMode.cover}
              source={{ uri: navigation.state.params.menuIcon }}
            />
          ) : (
              <FastImage
                style={styles.userPhoto}
                resizeMode={FastImage.resizeMode.cover}
                source={DynamicAppStyles.iconSet.userAvatar}
              />
            )}
        </TouchableOpacity>
      );
    },
    headerRight: (
      <View style={HeaderButtonStyle.multi}>
        <HeaderButton
          customStyle={styles.composeButton}
          icon={DynamicAppStyles.iconSet.compose}
          onPress={() => {
            navigation.state.params.onPressPost();
          }}
        />
        <HeaderButton
          customStyle={styles.mapButton}
          icon={DynamicAppStyles.iconSet.map}
          onPress={() => {
            navigation.navigate("Map");
          }}
        />
      </View>
    )
  });

  constructor(props) {
    super(props);

    this.listingItemActionSheet = React.createRef();

    this.state = {
      activeSlide: 0,
      categories: [],
      listings: [],
      allListings: [],
      savedListings: [],
      selectedItem: null,
      showedAll: false,
      postModalVisible: false,
    };

    this.didFocusSubscription = props.navigation.addListener(
      "didFocus",
      payload =>
        BackHandler.addEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentDidMount() {
    this.categoriesUnsubscribe = firebaseListing.subscribeListingCategories(
      this.onCategoriesCollectionUpdate
    );

    this.savedListingsUnsubscribe = firebaseListing.subscribeSavedListings(
      this.props.user.id,
      this.onSavedListingsCollectionUpdate
    );

    this.listingsUnsubscribe = firebaseListing.subscribeListings(
      { categoryId: ListingAppConfig.homeConfig.mainCategoryID },
      this.onListingsCollectionUpdate
    );

    this.props.navigation.setParams({
      onPressPost: this.onPressPost,
      menuIcon: this.props.user.profilePictureURL,
      onModal: this.onModal
    });

    this.willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      payload =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentWillUnmount() {
    this.categoriesUnsubscribe();
    this.listingsUnsubscribe();
    this.savedListingsUnsubscribe();
    this.didFocusSubscription && this.didFocusSubscription.remove();
    this.willBlurSubscription && this.willBlurSubscription.remove();
  }

  onBackButtonPressAndroid = () => {
    BackHandler.exitApp();
    return true;
  };

  onCategoriesCollectionUpdate = querySnapshot => {
    const data = [];
    querySnapshot.forEach(doc => {
      const category = doc.data();
      data.push({ ...category, id: doc.id });
    });
    this.setState({
      categories: data,
      loading: false
    });
  };

  onListingsCollectionUpdate = querySnapshot => {
    const data = [];
    querySnapshot.forEach(doc => {
      const listing = doc.data();
      if (this.state.savedListings.findIndex(k => k == doc.id) >= 0) {
        listing.saved = true;
      } else {
        listing.saved = false;
      }
      data.push({ ...listing, id: doc.id });
    });

    this.setState({
      listings: data.slice(0, Configuration.home.initial_show_count),
      allListings: data,
      loading: false,
      showedAll: data.length <= Configuration.home.initial_show_count
    });
  };

  onSavedListingsCollectionUpdate = querySnapshot => {
    const savedListingdata = [];
    querySnapshot.forEach(doc => {
      const savedListing = doc.data();
      savedListingdata.push(savedListing.listingID);
    });
    const listingsData = [];
    this.state.listings.forEach(listing => {
      const temp = listing;
      if (savedListingdata.findIndex(k => k == temp.id) >= 0) {
        temp.saved = true;
      } else {
        temp.saved = false;
      }
      listingsData.push(temp);
    });

    this.setState({
      savedListings: savedListingdata,
      listings: listingsData,
      loading: false
    });
  };

  onPressPost = () => {
    this.setState({
      selectedItem: null,
      postModalVisible: true
    });
  };

  onPostCancel = () => {
    this.setState({ postModalVisible: false });
  };

  onPressCategoryItem = item => {
    this.props.navigation.navigate("Listing", { item: item });
  };

  onPressListingItem = item => {
    this.props.navigation.navigate("Detail", {
      item: item,
      customLeft: true,
      routeName: "Home",
    });
  };

  onLongPressListingItem = item => {
    if (item.authorID === this.props.user.id) {
      this.setState({ selectedItem: item }, () => {
        this.listingItemActionSheet.current.show();
      });
    }
  };

  onShowAll = () => {
    this.props.navigation.navigate("Listing", { item: { id: ListingAppConfig.homeConfig.mainCategoryID, name: ListingAppConfig.homeConfig.mainCategoryName } });
    // this.setState({
    //   showedAll: true,
    //   listings: this.state.allListings
    // });
  };

  onPressSavedIcon = item => {
    firebaseListing.saveUnsaveListing(item, this.props.user.id);
  };

  onModal = (modalVisible, callback) => {
    this.setState({ [modalVisible]: !this.state[modalVisible] }, () => {
      callback;
    });
  };

  onAddListing = () => {
    this.onModal("isMyListingVisible", this.onModal("isAddListingVisible"));
  };

  onLisingItemActionDone = index => {
    if (index == 0) {
      this.setState({
        postModalVisible: true
      });
      console.log(index);
    }

    if (index == 1) {
      Alert.alert(
        IMLocalized("Delete Listing"),
        IMLocalized("Are you sure you want to remove this listing?"),
        [
          {
            text: IMLocalized("Yes"),
            onPress: this.removeListing,
            style: "destructive"
          },
          { text: IMLocalized("No") }
        ],
        { cancelable: false }
      );
    }
  };

  removeListing = () => {
    firebaseListing.removeListing(this.state.selectedItem.id, ({ success }) => {
      if (!success) {
        alert(IMLocalized("There was an error deleting the listing. Please try again"));
      }
    });
  };

  renderCategoryItem = ({ item }) => (
    <TouchableOpacity onPress={() => this.onPressCategoryItem(item)}>
      <View style={styles.categoryItemContainer}>
        <FastImage
          style={styles.categoryItemPhoto}
          source={{ uri: item.photo }}
        />
        <Text style={styles.categoryItemTitle}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  renderCategorySeparator = () => {
    return (
      <View
        style={{
          width: 10,
          height: "100%"
        }}
      />
    );
  };

  renderListingItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => this.onPressListingItem(item)}
        onLongPress={() => this.onLongPressListingItem(item)}
      >
        <View style={TwoColumnListStyle.listingItemContainer}>
          <FastImage
            style={TwoColumnListStyle.listingPhoto}
            source={{ uri: item.photo }}
          />
          <SavedButton
            style={TwoColumnListStyle.savedIcon}
            onPress={() => this.onPressSavedIcon(item)}
            item={item}
          />
          <Text style={{ ...TwoColumnListStyle.listingName, maxHeight: 40 }}>
            {item.title}
          </Text>
          <Text style={TwoColumnListStyle.listingPlace}>{item.place}</Text>
          <StarRating
            containerStyle={styles.starRatingContainer}
            maxStars={5}
            starSize={15}
            disabled={true}
            starStyle={styles.starStyle}
            emptyStar={AppIcon.images.starNoFilled}
            fullStar={AppIcon.images.starFilled}
            halfStarColor={DynamicAppStyles.colorSet.mainThemeForegroundColor}
            rating={item.starCount}
          />
        </View>
      </TouchableOpacity>
    );
  };

  renderListingFooter = () => {
    return (
      <Button
        containerStyle={TwoColumnListStyle.showAllButtonContainer}
        style={TwoColumnListStyle.showAllButtonText}
        onPress={() => this.onShowAll()}
      >
        {IMLocalized("Show all")} ({this.state.allListings.length})
      </Button>
    );
  };

  render() {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{IMLocalized("Categories")}</Text>
        <View style={styles.categories}>
          <FlatList
            horizontal={true}
            initialNumToRender={4}
            ItemSeparatorComponent={() => this.renderCategorySeparator()}
            data={this.state.categories}
            showsHorizontalScrollIndicator={false}
            renderItem={(item) => this.renderCategoryItem(item)}
            keyExtractor={item => `${item.id}`}
          />
        </View>
        <Text style={[styles.title, styles.listingTitle]}>
          {ListingAppConfig.homeConfig.mainCategoryName}
        </Text>
        <View style={styles.listings}>
          <FlatList
            vertical
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              !this.state.showedAll ? this.renderListingFooter : ""
            }
            numColumns={2}
            data={this.state.listings}
            renderItem={this.renderListingItem}
            keyExtractor={item => `${item.id}`}
          />
        </View>
        {this.state.postModalVisible && (
          <PostModal
            selectedItem={this.state.selectedItem}
            categories={this.state.categories}
            onCancel={this.onPostCancel}
          />
        )}
        <ActionSheet
          ref={this.listingItemActionSheet}
          title={IMLocalized("Confirm")}
          options={[IMLocalized("Edit Listing"), IMLocalized("Remove Listing"), IMLocalized("Cancel")]}
          cancelButtonIndex={2}
          destructiveButtonIndex={1}
          onPress={index => {
            this.onLisingItemActionDone(index);
          }}
        />
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    flex: 1,
    padding: Configuration.home.listing_item.offset
  },
  title: {
    fontWeight: "bold",
    color: AppStyles.color.title,
    fontSize: 20,
    marginBottom: 15
  },
  listingTitle: {
    marginTop: 10,
    marginBottom: 10
  },
  categories: {
    marginBottom: 7
  },
  categoryItemContainer: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingBottom: 10
  },
  categoryItemPhoto: {
    height: 60,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    width: 110
  },
  categoryItemTitle: {
    fontFamily: AppStyles.fontName.bold,
    fontWeight: "bold",
    color: AppStyles.color.categoryTitle,
    margin: 10
  },
  userPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 10
  },
  mapButton: {
    marginRight: 13,
    marginLeft: 7
  },
  composeButton: {
  },
  starStyle: {
    tintColor: DynamicAppStyles.colorSet.mainThemeForegroundColor
  },
  starRatingContainer: {
    width: 90,
    marginTop: 10
  },
});

const mapStateToProps = state => ({
  user: state.auth.user
});

export default connect(mapStateToProps)(HomeScreen);
